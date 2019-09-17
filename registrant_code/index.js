var in_plain_english = {
    "FriendsOfFondrenLibraryMembershipID2": "FoFL Member ID",
    //"SchoolDepartmentOrProgram":"Department",
    "SelectAffiliation": "Affiliation",
    "RiceNetID": "NetID",
    "Phone2": "Phone",
    "FullName": "Name",
    "Email2": "Email"
};

Date.prototype.formatMMDDYY = function(){
    var today = new Date();
    return (this.getMonth() + 1) +
        "/" +  this.getDate() +
        "/" +  (today.getFullYear()-2000);
};

var AirtablePlus = require('airtable-plus');
var airtable = new AirtablePlus(
    {apiKey: process.env.apiKey,
        baseID: process.env.baseID,
        tableName: 'Registrants New'});

var airtable_affiliation = new AirtablePlus(
    {apiKey: process.env.apiKey,
        baseID: process.env.baseID,
        tableName: 'Affiliation'});

var AWS = require('aws-sdk');
var lambda = new AWS.Lambda();

function stringize_object(obj){ //for debugging
    for(var key in obj){
        if(obj.hasOwnProperty(key)){
            console.log(key + " " + obj[key]);
        }
    }
}

exports.handler = async (event) => {
    // TODO implement
    //console.log(event.Records);
    var response = {};

    console.log(event.Records[0].Sns.Message);
    var cognitoPayload = event.Records[0].Sns.Message;
    console.log(typeof cognitoPayload);
    if(typeof cognitoPayload == "string"){
        cognitoPayload = JSON.parse(cognitoPayload);
    }
    //cognitoPayload = JSON.parse(cognitoPayload);
    //code to gather affiliation
    for(var aff_prop in cognitoPayload.RiceAffiliation){
        console.log(aff_prop);
        if (in_plain_english.hasOwnProperty(aff_prop) && cognitoPayload.RiceAffiliation[aff_prop] != null){
            response[in_plain_english[aff_prop]] = cognitoPayload.RiceAffiliation[aff_prop];
            console.log(response);

        }
    }

    //code to gather submission date
    //var registrant_date = new Date(cognitoPayload.Entry.Timestamp);
    var registrant_date = new Date();
    console.log("before date");
    response["Registration Date"] = registrant_date.formatMMDDYY();
    console.log(response);

    //code to gather contact info
    for(var contact_prop in cognitoPayload.ContactInfo){
        console.log(contact_prop);
        if (in_plain_english.hasOwnProperty(contact_prop) && cognitoPayload.ContactInfo[contact_prop] != null) {

            response[in_plain_english[contact_prop]] = cognitoPayload.ContactInfo[contact_prop];
            console.log(response);

        }
    }
    var filter = 'Affiliation = \"'+response['Affiliation']+'\"';
    console.log(filter);
    let affill = await airtable_affiliation.read({filterByFormula: filter});
    stringize_object(affill[0]);
    response['Affiliations'] = [affill[0].id];
    console.log(response);
    console.log("before returning await");
    let a = await airtable.create(response).then(value => {
        return value; // value is a JSON object with "id", "fields", "createdTime" keys
    }); //airtable.upsert('Name', response) has an error

    var personId = a.id;
    console.log(personId);
    event["personId"] = personId; //provide recordid, linking to person in registrants table (this table)


    var params = {
        FunctionName: process.env.functionInvoke, // the lambda function we are going to invoke
        Payload: JSON.stringify(event)
    };

    return lambda.invoke(params).promise();

    // for(var it in a){
    //     if (a.hasOwnProperty(it)) {
    //         console.log(it.toString() + " value " + a[it].toString() + " value ");
    //     }
    // }

    // const response = {
    //     statusCode: 200,
    //     body: event.reqbody
    // };
    //return response;
};
