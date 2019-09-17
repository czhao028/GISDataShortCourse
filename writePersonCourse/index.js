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
        tableName: 'Person/Course Table New'});
var airtable_session = new AirtablePlus(
    {apiKey: process.env.apiKey,
        baseID: process.env.baseID,
        tableName: 'Sessions'});

var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

async function getShortForm(long_form_string){
    console.log(long_form_string);
    let a = await dynamodb.getItem({"TableName": "Option-Session", "Key": {"formoption": {"S": long_form_string.trim()}}},
        function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else{
                console.log("Get item data" + data);
                //return data.Item.session["S"]; //the short form of the course
            }
        }).promise();
    return a.Item.session["S"];
}

function stringize_object(obj){ //for debugging
    for(var key in obj){
        if(obj.hasOwnProperty(key)){
            console.log(key + " " + obj[key]);
        }
    }
}

async function createPayload(long_name, key_value_pairs){
    //long_name is long form of course
    //key_value_pairs are optional: include a dictionary of attribute-values

    var payload = {};
    var regex = /\d+/;

    var shortFormShortCourse = await getShortForm(long_name);
    if(shortFormShortCourse.match(regex) == null){
        var dateShortCourse = new Date(long_name.split("|")[0].split("-")[0]);
        //splits into date/time, course [ | delimited], then extracts the day from date/time [cuts off ]
        shortFormShortCourse = shortFormShortCourse + " " + dateShortCourse.formatMMDDYY();
    }
    payload["Course"] = shortFormShortCourse;
    console.log(shortFormShortCourse);

    for(var key in key_value_pairs){ //set the optional params key-value in payload
        if(key_value_pairs.hasOwnProperty(key)){
            payload[key] = key_value_pairs[key];
        }
    }

    console.log('Session = \"'+shortFormShortCourse+'\"'+ " finding course");
    let course = await airtable_session.read({filterByFormula: 'Session = \"'+shortFormShortCourse+'\"'});
    stringize_object(course[0]);
    if(course.length >= 1){
        payload["Courses"] = [course[0].id];
    }

    // for(var column in columntoTable){ //set linkages
    //     if(columntoTable.hasOwnProperty(column)){
    //         var airtable_table = new AirtablePlus(
    //             {apiKey: process.env.apiKey,
    //                 baseID: process.env.baseID,
    //                 tableName: columntoTable[column]});
    //         let result = await airtable_table.read({filterByFormula: '{' + column + '}'})
    //     }
    // }

    return payload;


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

    var name = cognitoPayload.ContactInfo.FullName;
    var email = cognitoPayload.ContactInfo.Email2;
    var optional_params = {
        "Registrant": name,
        "Email": email,
        "Status": "R",
        "Registrants": [event.personId]
    };

    //var columntoTable = JSON.parse(process.env.columntoTable);

    // to get courses
    var courseObject = cognitoPayload.GDCCourseSelection;
    for(var category in courseObject){
        if(courseObject.hasOwnProperty(category)){
            if(category.toLowerCase().includes("warning")){
                continue; // "i.e. WarningYouAreRegisteringForACourseWithAnIntroductionToGISPrerequisite_IsRequired"
            }
            if(typeof courseObject[category] == "string"){
                var long_name = courseObject[category];
                let payload = await createPayload(long_name, optional_params);
                console.log("this is payload");
                stringize_object(payload);
                let resp = await airtable.create(payload);
            }
            else if(typeof courseObject[category] == "object"){
                for(var index in courseObject[category]){ //courseObject[category] is an array
                    var long_name_array = courseObject[category][index];
                    var payload_array = await createPayload(long_name_array, optional_params);
                    console.log("this is payload");
                    stringize_object(payload_array);
                    let resp = await airtable.create(payload_array);

                }
            }
        }

    }

    //console.log(response);
    //console.log("before returning await");
    //return await airtable.upsert('Name', response);
    //return await airtable.create( response);


    // const response = {
    //     statusCode: 200,
    //     body: event.reqbody
    // };
    //return response;
};
