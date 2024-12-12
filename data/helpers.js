//Checks to see if a function was given the right number of arguments.
import {users} from '../config/mongoCollections.js';
import crypto from "crypto";

export function checkArgs(args, length) {
    if(args.length != length) {
        throw "Wrong number of arguments. Should be " + length + ".";
    }
    return;
}

//Checks to see if a variable is a string, trims leading and trailing spaces from it, and then checks 
//if the resulting string is empty. Returns the trimmed string if an error is not thrown.
export function checkString(str, name) {
    if (str == null) {
        throw name + " cannot be empty."
    }
    if(!(typeof str === "string")) {
        throw name + " is not a string.";
    }
    str = str.trim();
    if(str.length == 0) {
        throw name + " has zero non-space characters.";
    }
    return str;
}

export function doubleHash(passwd) {
    let digest1 = crypto.createHash("sha256").update(passwd).digest("hex");
    let digest2 = crypto.createHash("sha256").update(digest1).digest("hex");
    return digest2;
}

export function checkId(id, varName) {
    id = checkString(id, "id");
    if(!(ObjectId.isValid(id))) {
        throw varName + " is not a valid id.";
    }
    return id;
}

export function checkValidDate(date, varName) { 
    if (date == null) { 
        throw `${varName} cannot be null`; 
    } 

    const inputDate = new Date(date); 

    if (isNaN(inputDate.getTime())) { 
        throw `${varName} must be a valid date`; 
    } const today = new Date(); 
    
    today.setHours(0, 0, 0, 0); 

    return true
}

export function isValidTime(time, varName) {
    const date = new Date(time) 
    if (isNaN(date.getTime())) { 
        return false; 
    }  
    
    const [hours, minutes] = time.split(':').map(Number); 
    if (hours < 0 || hours > 23 || isNaN(hours)) {
        throw `Invalid `
    }
    if (minutes < 0 || minutes > 59 || isNaN(minutes)) {
        return false; 
    }
    
    return true;
}

export function isValidTimeEnd(time, varName) {
    const date = new Date(time) 
    if (isNaN(date.getTime())) { 
        return false; 
    }  
    
    const [hours, minutes] = time.split(':').map(Number); 
    if (hours < 0 || hours > 23 || isNaN(hours)) {
        return false; 
    }
    if (minutes < 0 || minutes > 59 || isNaN(minutes)) {
        return false; 
    }
    
    return true;
}