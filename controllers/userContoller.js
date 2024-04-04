
const {realtimeDB, trainModel, db, fs, brain, admin, registeredUsers,registerUser,storeRoutine, realtimeUpdate } = require("../utils/modelTrain.js");
const { Timestamp } = require("@firebase/firestore");
const schedule = require('node-schedule');

exports.toggleLED = async (req, res, next) => {
    try {

        let noteDate = Timestamp.fromDate(new Date()).toDate();
        const prevTime = (await db.collection("devices").doc("yoKfA0fkVemDvq6jBIwE").get()).data().toggledDate.toDate();
        console.log(prevTime.toString());
        console.log(noteDate.toString());
        let userJson = {
	    deviceName : "Ceiling Lights", 
	    deviceType : "Lights",
            timeUsed : "8h 12min",
            toggle: req.body.toggle,
            toggledDate: noteDate
        }
    

        let response = await db.collection("devices").doc("yoKfA0fkVemDvq6jBIwE").set(userJson);
	await realtimeUpdate(req.body.toggle, 'Ceiling Lights');
        await trainModel(prevTime, 'modelJSON.json', '../ledData.json', 'yoKfA0fkVemDvq6jBIwE');

        res.send(response);

    }
    catch (error) {
        console.error(error.message);
        next(error);

    }
}

exports.getLedModel = async(req, res, next) => {
    try {
        var fileName;
        var modelName;
        if (await req.query.modelID === "1"){
            fileName = '../ledData.json';
            modelName = "modelJSON.json";
        }
        else if (await req.query.modelID === "2") {
            fileName = '../floorData.json';
            modelName = 'modelFloorJSON.json';
        }
        let bucket = admin.storage().bucket();
        
        let net = new brain.NeuralNetwork();
        let ledStateData;

        try {
            let data = fs.readFileSync(fileName, 'utf-8');
            ledStateData = JSON.parse(data);
            console.log(ledStateData);
            
        }
        catch (error) {
            console.log("No Led Data to be read at the time");
        }

        await bucket.file(modelName).download((err, fileBuffer) => {
            var resultJson = {};
            if (err) {
                console.log(err);
            }
            else {
                var jsonString = fileBuffer.toString('utf-8');
                var jsonData = JSON.parse(jsonString);
                net.fromJSON(jsonData);
                net.train(ledStateData);

                for (let i = 0; i < 24; i++){
                    resultJson[`Hour_${i}`] = net.run({t : i, f : 0});
                }
            }
            res.send(resultJson);
        });

    }
    catch (err) {
        console.log(err);
    }
}

exports.toggleFloorLight = async (req, res) => {
    try {

        let noteDate = Timestamp.fromDate(new Date()).toDate();
        const prevTime = (await db.collection("devices").doc("fHOA9x1sdFOaQQvMjJ4j").get()).data().toggledDate.toDate();
        console.log(prevTime.toString());
        console.log(noteDate.toString());
        let userJson = {
                deviceName : "Floor Lights", 
	            deviceType : "Lights",
                timeUsed : "0h 53min",
                toggle: req.body.toggle,
                toggledDate: noteDate
        }
    

        let response = await db.collection("devices").doc("fHOA9x1sdFOaQQvMjJ4j").set(userJson);
	await realtimeUpdate(req.body.toggle, 'Floor Lights');
        await trainModel(prevTime, 'modelFloorJSON.json', '../floorData.json', 'fHOA9x1sdFOaQQvMjJ4j');
        res.send(response);

    }
    catch (error) {
        console.error(error.message);
        next(error);

    }
}


exports.signup = async (req, res) => {
    try {
        if (!req.body.id || !req.body.password){
            res.status("400");
            res.send("false");
        }
        else {
            let userList = await registeredUsers();
            console.log(userList);
            let flag = true;
            userList.forEach(element => {
                if (req.body.id === element.username){
                    flag = false;
                }
            });
            if (flag === false) res.send("false");
            else {
                await registerUser(req.body.id, req.body.password);
                res.send("true");
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400);
    }
}


exports.signin = async (req, res) => {
    try {
        if (!req.body.id || !req.body.password){
            res.status("400");
            res.send("false");
        }
        else {
            let userList = await registeredUsers();
            console.log(userList);
            let flag = false;
            let foundElement;
            userList.forEach(element => {
                if (req.body.id === element.username){
                    flag = true;
                    foundElement = element;
                }
            });
            if (flag == false) res.send("false");
            else {
                if (req.body.password !== foundElement.password) res.send("false");
                else {
                    res.send("true");
                }
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400);
    }
}


exports.scheduleRoutine = async (req, res) => {
    try {
        
        let routineAction = req.body.action;
        let routineDevice = req.body.device;
        let routineTime = req.body.time;
        let routineName = req.body.routineName;

         //first one to store the routine in firestore
        await storeRoutine(routineAction, routineDevice, routineName, routineTime);


        //now extract the hour and second from routineTime

        let routineHour = routineTime.split(':')[0];
        let routineMinute = routineTime.split(':')[1];
	let scheduleTime = routineMinute + ' ' + routineHour + ' * * *';
	console.log(scheduleTime);      

        const job = schedule.scheduleJob(scheduleTime, async function(){
            await db.collection("devices").where("deviceName", "==", routineDevice)
            .get()
            .then(async function(querySnapshot) {
                querySnapshot.forEach(async document => {
		    console.log(document.id);
		    let timeToggled =  Timestamp.fromDate(new Date()).toDate();
                    if (routineAction.toLowerCase().includes("turn off")){
                        await db.collection("devices").doc(document.id).update({toggle: 0, toggledDate : timeToggled});
			await realtimeUpdate(0, routineDevice);
                    }else if (routineAction.toLowerCase().includes("turn on")){
                        await db.collection("devices").doc(document.id).update({toggle: 1, toggledDate : timeToggled});
			await realtimeUpdate(1, routineDevice);
                    }
                })
            })
            .catch((error) =>{
                console.log(error)
            });
        })
        
        res.send("success");
    } catch (error) {
        res.status(400);
    }
}



exports.toggleFlame = async (req, res) => {
    
    try {
        if (req.body.toggle === null){
            res.status(400);
            res.send("Improper Request format");
        }
        else {
	    await db.collection("devices").doc("LupXUFpTEaBcqlN7K6UI").update({
                toggle : req.body.toggle
            });
            await realtimeDB.ref('devices').child('Flame Sensor').set(req.body.toggle);
            res.status(200);
            res.send('Good Request');
        }
    } catch (error) {
        res.status(500);
    }
  
}
