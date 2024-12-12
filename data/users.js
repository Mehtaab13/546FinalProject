import {users} from '../config/mongoCollections.js';
import {events} from '../config/mongoCollections.js';
import {ObjectId} from "mongodb";
import * as helpers from "./helpers.js";
import * as eventsData from "./events.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: "eventplanner363@gmail.com",
      pass: process.env.PASSWD
    },
  });

//Returns an object of all users, where the keys are the email addresses, and the values are ther user 
//objects themselves. Not debugged as of 11/26.

export async function getUserById(id) {
    id = helpers.checkString(id, "id");    
    if (!ObjectId.isValid(id)) {
        throw 'invalid object ID';
    }
    const userCollection = await users();
    const user = await userCollection.findOne({_id: new ObjectId(id)});
    if (user === null) {
        throw 'No user with that id';
    }
    user._id = user._id.toString();
    return user;
}

export async function usersByEmail() {
    const allUsers = await users();
    let theUsers = await allUsers.find({}).toArray();
    let finalObject = {};
    for(let a = 0; a < theUsers.length; a++) {
        let theUser = theUsers[a];
        finalObject[theUser["email"]] = theUser;
    }
    return finalObject;
}
//Returns a user from the DB by their email address. Returns false if the email does not exist in the DB.
export async function getUserByEmail(email) {
    helpers.checkArgs(arguments, 1);
    email = helpers.checkString(email, "email");
    let usersObject = await usersByEmail();
    let theUser = usersObject[email];
    if(theUser === undefined) {
        return false;
    }
    return theUser;
}


export async function addUser(first, last, email, theClass, p1, p2) {
    //await removeUserByEmail("zthompso@stevens.edu");
    helpers.checkArgs(arguments, 6);
    first = helpers.checkString(first, "First name");
    last = helpers.checkString(last, "Last name");
    email = helpers.checkString(email, "Email address");
    //checkString trims leading/trailing spaces, so it should not be applied to passwords.
    if(p1 !== p2) {
        throw "Passwords do not match.";
    }
    if(p1.length === 0) {
        throw "Password is 0 characters long.";
    }
    if(email.length < 12) {
        throw "Email does not end in @stevens.edu.";
    }
    let trailing = email.slice(-12);
    if(trailing !== "@stevens.edu") { 
        throw "Email does not end in @stevens.edu.";
    }
    let exists = await getUserByEmail(email);    
    if(exists) {
        throw "Account already exists with that email.";
    }
    let theUser = {};
    theUser["firstName"] = first;
    theUser["lastName"] = last;
    theUser["class"] = theClass;
    theUser["verified"] = false; //Refers to whether the user is verified (can create their own events, etc)
    theUser["emailVerified"] = false; //Refers to whether the user's email is verified (can login to their account)
    theUser["email"] = email;
    //The DB stores the password hashed twice, aka the hash of the hash of the password.
    theUser["password"] = helpers.doubleHash(p1);
    theUser["verificationCode"] = ""; 
    /* ^This will contain the verification code that is sent to the user. It is randomly generated
    and added by sendEmail. */
    const theUsers = await users();
    const insertInfo = await theUsers.insertOne(theUser);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
      throw "Add user failed."
    }
    const theId = insertInfo.insertedId.toString();
    const finalUser = await getUserById(theId);
    return finalUser;
}

export async function removeUserByEmail(email) {
    helpers.checkArgs(arguments, 1);
    email = helpers.checkString(email, "email");
    const theUsers = await users();
    const theUser = await getUserByEmail(email);
    const theInfo = await theUsers.findOneAndDelete({_id: new ObjectId(theUser["_id"]
    )});
    if(!theInfo) {
      throw "Could not delete user.";
    }
    console.log("Success.");
  };

export async function updateUserInfo(theUser, id) {
    const theUsers = await users();
    const theInfo = await theUsers.findOneAndUpdate(
      {_id: new ObjectId(id)},
        {$set: theUser},
        {returnDocument: 'after'}
      );
    if (!theInfo) {
        throw "Could not update user.";
    }
    const finalUser = await getUserById(id);
    return finalUser;
}

//Used for changing 1 field in a user object.
export async function changeField(email, field, newValue) {
    let theUser = await getUserByEmail(email);
    theUser[field] = newValue;
    let finalUser = await updateUserInfo(theUser, theUser["_id"].toString());
    return finalUser;
}

//Send an account verification code or new password by email and change the value in the database.
export async function sendEmail(email, field, text) {
    let theUser = await getUserByEmail(email)
    if(!theUser) {
        throw "No user with that email.";
    }
    let code = Math.floor(Math.random() * 1000000);
    try{
        const info = await transporter.sendMail({
            from: '"EventPlanner" <eventplanner363@gmail.com>', 
            to: email, 
            subject: "Your EventPlanner Account", 
            text: "Your " + text + " is " + code,
            html: "<b>Your " + text + " is " + code + "</b>"
          });
    }
    catch(e) {
        throw "If the following error message incorrect email/password pair, the passwd variable \
        is probably the wrong value. It is defined at the top of the file.\n" + e;
    }
    const finalUser = await changeField(email, field, helpers.doubleHash(code.toString()));
    return finalUser;   
}

export async function checkCode(email, code) {
    //Checks if a the verification code is correct, and marks the account as having been email verified.
    helpers.checkArgs(arguments, 2);
    let theUser = await getUserByEmail(email);
    code = helpers.checkString(code, "Verification code");
    if(!theUser) {
        throw "No user exists with that email.";
    }
    if(theUser["emailVerified"]) {
        throw "Account has already been email verified.";
    }
    let hash = helpers.doubleHash(code);
    if(theUser["verificationCode"] !== hash) {
        throw "Incorrect verification code.";
    }
    finalUser = await changeField(theUser["email"], "emailVerified", true);
    return theUser;
}

//Checks the email/password pair, and checks if the user has verified their account.
export async function checkPassword(email, password) {
    helpers.checkArgs(arguments, 2);
    let theUser = await getUserByEmail(email);
    password = helpers.checkString(password, "password");
    if(!theUser) {
        throw "No user exists with that email.";
    }
    let hash = helpers.doubleHash(password);
    if(theUser["password"] !== hash) {
        throw "Incorrect password.";
    }
    if(!theUser["emailVerified"]) {
        throw "Account has not been email verified.";
    }
    return theUser;
}

  //Changes the password
  export async function newPassword(email, tempPassword, p1, p2) {
    let theUser = await checkPassword(email, tempPassword);
    if(p1 !== p2) {
        throw "Passwords do not match.";
    }
    if(p1.length === 0) {
        throw "Password is 0 characters long.";
    }
    const finalUser = await changeField(email, "password", helpers.doubleHash(p1));
    return finalUser;
  }

  export function getClass(user) {
    if(user["class"]) {
        return "Undergraduate";
    }
    else {
        return "Graduate";
    }
  }
