import {users} from '../config/mongoCollections.js';
import {events} from '../config/mongoCollections.js';
import {ObjectId} from "mongodb";
import * as helpers from "./helpers.js";
import * as usersData from "./users.js";

export async function addEvent() {

}

//Returns a list of all events from the DB.
export async function getAllEvents() {
    helpers.checkArgs(arguments, 0)
    const allEvents = await events();
    let theEvents = await allEvents.find({}).toArray();
    return theEvents;
}

export async function getEventByID(id) {
    id = isValidString(id)
    if (!ObjectId.isValid(id)) {
      throw 'invalid object ID'
    }
  
    const eventCollection = await events()
    const event = await eventCollection.findOne({_id: new ObjectId(id)})
  
    if (event === null) {
      throw 'No team with that id'
    }
  
    event._id = event._id.toString()
  
    return event
};

//Returns a list of all events whose class matches theClass parameter. 
export async function getEventsByClass(theClass) {
    helpers.checkArgs(arguments, 1);
    if(typeof theClass !== "boolean") {
        throw "class is not a boolean.";
    }
    let allEvents = await getAllEvents();
    let finalEvents = [];
    for(let a = 0; a < allEvents.length; a++) {
        let theEvent = allEvents[a];
        if(theEvent.class === theClass) {
            finalEvents.push(theEvent);
        }
    }
    return finalEvents;
}

export async function addEvent(name, description, date, starttime, endtime, location, organizer, feedback, rating, attendees, numberOfAttendees, Class, Poster) {
    
}