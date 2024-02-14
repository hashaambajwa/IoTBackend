
const fireBaseSplitter = (timeString) => {
    var splitString = timeString.split(" ", 5);
    var onlyTime = splitString[splitString.length - 1];
    let hour = parseInt(onlyTime.split(":", 1).pop());
    var minute = parseInt(onlyTime.split(":", 2).pop());
    return [hour, minute];
}


const timeConverter = (hour, minute, indicator) => {

    let timeInMinutes;
    if (indicator === 'A') {
        if (hour == 12) {
            timeInMinutes = minute;
        }
        else {
            timeInMinutes = hour * 60 + minute;
        }
    }
    else {
        timeInMinutes = hour * 60 + minute;
    }
    return timeInMinutes;
};

module.exports = {
    fireBaseSplitter,
    timeConverter
}

