const request = require("request");
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

exports.handler = function(event, context, callback) {

    const key = process.env.key;
    const url = "https://spreadsheets.google.com/feeds/list/"+key+"/od6/public/values?alt=json";

    request({
        json: true,
        url: 'http://gsx2json.com/api?id=1KSsGL1sPx3t1l-9EIxEPhxmDDP0C9YEwD7IpELm9QmA&sheet=3'
    }, function (error, response, body) {
        //console.log(response.body["rows"]);
        var key = "formoption";
        var value = "session";
        var resp = {};
        var iter = response.body.rows;
        for(var row in iter){
            var iterator = iter[row];
            resp[iterator[key]] = iterator[value];
            console.log({"Item":{
                    "formoption": {"S":iterator[key]},
                    "session": {"S":iterator[value]}
                }});
            dynamodb.putItem({"TableName": "Option-Session", "Item":{
                    "formoption": {"S":iterator[key].trim()},
                    "session": {"S":iterator[value].trim()}
                }}, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else     console.log(data);           // successful response

            });
        }
        console.log(resp);
        callback(null, resp);
    });
};
