const brain = require("brain.js");
const fs = require("fs");
const { Timestamp } = require("@firebase/firestore");

const admin = require("firebase-admin");
const credentials = require("../config/key.json");
const {fireBaseSplitter, timeConverter} = require("./helper.js");



admin.initializeApp({
    credential: admin.credential.cert(credentials),
    storageBucket: "gs://iot-enabled-smart-home.appspot.com"
})

const db = admin.firestore();


async function retreiveDB(prevDate) {
    //get the current snapshot of teh database
    //const snapshot = await db.collection("ledValue").get();

    //Add logic later to also check if the days match
    let snapshot = (await db.collection("devices").doc("yoKfA0fkVemDvq6jBIwE").get()).data();
    //let ledStateData = [];
    let hourlyData = [];
    let count = 0;
    let j = 0;

    let [currHour, currMinute, currDay] = fireBaseSplitter(Timestamp.fromDate(new Date()).toDate().toString());
    let [prevHour, prevMinute, prevDay] = fireBaseSplitter(prevDate.toString());
    console.log(currDay + " "  + prevDay);
    console.log(currHour + " " + prevHour);

    let currTime = timeConverter(currHour, currMinute, currHour < 12 ? 'A' : 'P');
    let prevTime = timeConverter(prevHour, prevMinute, prevHour < 12 ? 'A' : 'P');

  
    console.log("Prev Time is: " + prevTime + " and Curr Time is: " + currTime);


    var hourMap = new Map();
    for (i=0; i<24; i++){
        hourMap.set(i,[]);
    }
    if ((currDay - prevDay) === 0){
        for (let i = prevTime; i <= currTime; i++) {

            if (snapshot.toggle === 1) {
                //ledStateData.push({input: {time: i}, output: {off: 0}});
                hourMap.get(Math.floor(i/60)).push(0);
                
                //ledStateData.push({input : {t : i/1440, f : 0}, output : {off : 1}});
            }
            else if (snapshot.toggle === 0) {
                hourMap.get(Math.floor(i/60)).push(1);
                //ledStateData.push({input: {time: i}, output: {on: 1}});
                //ledStateData.push({input : {t : i/1440, f : 0}, output : {on : 1}});
            }
        }
    }
    else {
        let j = 0;
        while (j <= (currDay - prevDay)){
            for (let i = prevTime; i <= 1439; i++) {

                if (snapshot.toggle === 1) {
                    //ledStateData.push({input: {time: i}, output: {off: 0}});
                    hourMap.get(Math.floor(i/60)).push(0);
                    
                    //ledStateData.push({input : {t : i/1440, f : 0}, output : {off : 1}});
                }
                else if (snapshot.toggle === 0) {
                    hourMap.get(Math.floor(i/60)).push(1);
                    //ledStateData.push({input: {time: i}, output: {on: 1}});
                    //ledStateData.push({input : {t : i/1440, f : 0}, output : {on : 1}});
                }
            }
            prevTime = 0;
            j++;
        }
        for (let i = 0; i <= currTime; i++) {

            if (snapshot.toggle === 1) {
                //ledStateData.push({input: {time: i}, output: {off: 0}});
                hourMap.get(Math.floor(i/60)).push(0);
                
                //ledStateData.push({input : {t : i/1440, f : 0}, output : {off : 1}});
            }
            else if (snapshot.toggle === 0) {
                hourMap.get(Math.floor(i/60)).push(1);
                //ledStateData.push({input: {time: i}, output: {on: 1}});
                //ledStateData.push({input : {t : i/1440, f : 0}, output : {on : 1}});
            }
        }
    }

 
    
    for (let i = 0; i < 24; i++){
        if (hourMap.get(i).length !== 0){
            let sum = hourMap.get(i).reduce((a,b) => a + b, 0);
            let avg = (sum / hourMap.get(i).length) || 0;
            hourlyData.push({input : {t : i, f : 0}, output : {on : avg}});
        }
    }
    console.log(hourlyData);


    try {
        const data = fs.readFileSync('../ledData.json', 'utf-8');
        const jsonData = JSON.parse(data);
        hourlyData = jsonData.concat(hourlyData);
    }
    catch (error) {
        console.log("No Led Data to be read at the time");
    }

    return hourlyData;



}

async function trainModel(prevDate) {
    try {

        //Get reference to storage bucket in firebase
        let bucket = await admin.storage().bucket();


        //Retreive the data in the database
        let trainingData = await retreiveDB(prevDate);
      
        if (trainingData.length > 168){
            trainingData = trainingData.slice(-168);
        }
        console.log(trainingData);

        //Create a new NeuralNetwork

        net = new brain.NeuralNetwork();
        await bucket.file("modelJSON.json").download((err, fileBuffer) => {
            if (err) {
                console.log("Must create new file!")
            }
            else {
                let jsonString = fileBuffer.toString('utf-8');
                let jsonData = JSON.parse(jsonString);
                net.fromJSON(jsonData);
                let modelJSON = net.toJSON();
                console.log(modelJSON);

            }
        });
        net.train(trainingData, { keepNetworkIntact: true });


        setTimeout(async () => {


            let jsonString = JSON.stringify(net.toJSON(), null, 2);
            let buffer = Buffer.from(jsonString, 'utf-8');


            bucket.file("modelJSON.json").save(buffer, {
                contentType: 'application/json'
            }, (err) => {
                if (err) {
                    console.error("Error Writing to FB db storage");
                }
            })
            console.log("done");


            const bufferData = JSON.stringify(trainingData);
            fs.writeFile('../ledData.json', bufferData, (err) => {
                if (err) {
                    console.log("Error writing file");
                }
            });
        }, 7000);
    }
    catch (err) {
        console.log(err);
    }
}


module.exports = {
    trainModel,
    retreiveDB,
    db,
    admin,
    fs,
    brain
}
