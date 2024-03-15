
const {trainModel, db, fs, brain, admin } = require("../utils/modelTrain.js");
const { Timestamp } = require("@firebase/firestore");

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

        await trainModel(prevTime);

        res.send(response);

    }
    catch (error) {
        console.error(error.message);
        next(error);

    }
}

exports.getLedModel = async(req, res, next) => {
    try {
        let bucket = admin.storage().bucket();
        
        let net = new brain.NeuralNetwork();
        let ledStateData;

        try {
            let data = fs.readFileSync('../ledData.json', 'utf-8');
            ledStateData = JSON.parse(data);
            console.log(ledStateData);
            
        }
        catch (error) {
            console.log("No Led Data to be read at the time");
        }

        await bucket.file("modelJSON.json").download((err, fileBuffer) => {
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

