import request from 'request';
import * as AWS from 'aws-sdk';
const CLANID = '407685';

AWS.config.update({
	accessKeyId: process.env.accessKeyId,
	secretAccessKey: process.env.secretAccessKey,
	region: process.env.region
});

var docClient = new AWS.DynamoDB.DocumentClient();
const TABLENAME = 'Member';

interface MemberStatus {
   membershipId: string;
   onlineStatus: boolean;
   dateLastOn: Date;
}

export async function main(): Promise<any> {
   try {
      const memberStatuses = await GetOnlineStatuses();
      await UpdateStatusesInDb(memberStatuses);
   }
   catch(err) {
      throw err;
   }
}

function GetOnlineStatuses(): Promise<MemberStatus[]> {
   return new Promise<MemberStatus[]>((resolve, reject) => {
      const OPTIONS = {
         'url': `https://www.bungie.net/Platform/GroupV2/${CLANID}/Members/`,
         'headers': {
            'x-api-key': process.env.bungieApiKey,
         },
      };

      request.get(OPTIONS, (err, res, body) => {
         if(err) {
            reject(err);
         }
         if(res.statusCode !== 200) {
            reject(`Invalid status code: ${res.body}`);
         }
         else {
            let result : any = JSON.parse(body);
            let members: MemberStatus[] = [];
            result['Response']['results'].forEach((member: any) => {
               if(Object.prototype.hasOwnProperty.call(member, 'destinyUserInfo')) {
                  let dateLastOn = new Date(Date.now() - parseInt(member['lastOnlineStatusChange']));

                  members.push({
                     'membershipId': member['destinyUserInfo']['membershipId'],
                     'onlineStatus': member['isOnline'],
                     'dateLastOn': dateLastOn,
                  });
               }
            });

            resolve(members);
         }
      });
   });
}

function UpdateStatusesInDb(memberStatuses: MemberStatus[]) : Promise<void> {
   return new Promise((resolve, reject) => {
      const proms = memberStatuses.map(memberStatus => {
         return SendDbUpdateRequest(memberStatus);
      });

		Promise.all(proms).then(() => {
			resolve();
		}).catch((e) => {
			reject(e);
		});
   });
}

// See format for update request here: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03
function SendDbUpdateRequest(item: MemberStatus): Promise<void> {
	return new Promise((resolve, reject) => {
		const params: any = {
         TableName: TABLENAME,
         Key: {
            "membershipId": item.membershipId
         },
         UpdateExpression: "set onlineStatus = :s, dateLastOn = :d",
         ExpressionAttributeValues: {
            ":s": item.onlineStatus,
            ":d": item.dateLastOn.toString(),
         }
		};

		docClient.update(params, (err, data) => {
         if(err) {
            reject(err);
         }
         else {
            resolve();
         }
      });
	});
}