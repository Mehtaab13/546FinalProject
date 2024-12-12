import e, { Router } from 'express';
import * as main from "../public/js/main.js";
import path from "path";
import * as userData from "../data/users.js";
import * as eventData from "../data/events.js";
import * as helpers from "../data/helpers.js";
import { runInNewContext } from 'vm';
import { getUnpackedSettings } from 'http2';
import { getEnabledCategories } from 'trace_events';
import { userInfo } from 'os';
let activeUser = false;
/*
See index.js for description of each route.

*/
const router = Router();
router.get("/", (req, res) => {
  res.render(path.resolve("static/landingpage.handlebars"));
});
router.route("/signup").post(async (req, res) => {
  res.render(path.resolve("static/signup.handlebars"));
});
router.route("/login").post(async (req, res) => {
  if(activeUser) {
    let theUser = await userData.getUserByEmail(activeUser);
    let theEvents = await eventData.getEventsByClass(theUser.class);    
    res.render(path.resolve("static/homepage.handlebars"), {user: theUser, events: theEvents});
  }
  else {
    res.render(path.resolve("static/login.handlebars"));
  }
});
router.route("/createaccount").post(async (req, res) => {
  try {
    let theBody = req.body;
    let signupClass = true;
    if(theBody.signup_class === "on") {
      signupClass = false;
    }
    let userObject = await userData.addUser(
      theBody.signup_first_name,
      theBody.signup_last_name,
      theBody.signup_email,
      signupClass,
      theBody.signup_password1,
      theBody.signup_password2
    );
    const finalUserObject = await userData.sendEmail(userObject["email"], 
      "verificationCode", "verification code");
    res.render(path.resolve("static/verifyemail.handlebars"));
  }
  catch(e) {
    res.render(path.resolve("static/accounterror.handlebars"), 
      {error: "Create account error: " + e});
  }
});
router.route("/sendveremail").post(async (req, res) => {
  try {
    const theBody = req.body;
    if(theBody.new_veremail) {
      const finalUserObject = await userData.sendEmail(theBody.errorveremail, 
        "verificationCode", "verification code");
    }
    res.render(path.resolve("static/verifyemail.handlebars"));
  }
  catch(e) {
    res.render(path.resolve("static/accounterror.handlebars"), 
      {error: "Send account verification email error: " + e});
  }
});
router.route("/sendpasswdemail").post(async (req, res) => {
  try {
    const theBody = req.body;
    if(theBody.new_pwdemail) {
      const finalUserObject = await userData.sendEmail(req.body.errorpwdemail, 
        "password", "new password");
    }
    res.render(path.resolve("static/changepassword.handlebars"));
  }
  catch(e) {
    res.render(path.resolve("static/accounterror.handlebars"), 
      {error: "Create password reset email error: " + e});
  }
});
router.route("/changepassword").post(async (req, res) => {
  try {
    const theBody = req.body;
    let theUser = await userData.newPassword(
      theBody.changepassword_email, 
      theBody.temp_passwd,
      theBody.changepassword_pwd1,
      theBody.changepassword_pwd2);
    let theEvents = await eventData.getEventsByClass(theUser.class);
    activeUser = theUser["email"];
    res.render(path.resolve("static/homepage.handlebars"), {user: theUser, events: theEvents});
  }
  catch(e) {
    res.render(path.resolve("static/accounterror.handlebars"), 
      {error: "Reset password error: " + e});
  }
});
router.route("/checkpassword").post(async (req, res) => {
  let theBody = req.body;
  helpers.checkArgs(Object.values(theBody), 2);
  let theEmail = theBody.login_email;
  let thePassword = theBody.login_password;
  let theUser;
  try {
    theUser = await userData.checkPassword(theEmail, thePassword);
    activeUser = theUser["email"];

    let finalUser = await userData.changeField(activeUser, "verified", true);

    let theEvents = await eventData.getEventsByClass(finalUser.class);
    
    res.render(path.resolve("static/homepage.handlebars"), {user: finalUser, events: theEvents});
  }
  catch(e) {
    res.render(path.resolve("static/accounterror.handlebars"), 
      {error: "Login error: " + e});
  }
});
router.route("/verifyemail").post(async (req, res) => {
  let theBody = req.body;
  helpers.checkArgs(Object.values(theBody), 3);
  let theEmail = theBody.ve_email;
  let thePassword = theBody.ve_password;
  let theCode = theBody.ve_code;
  try {
    let theUser1 = await userData.checkPassword(theEmail, thePassword);
    let theUser2 = await userData.checkCode(theEmail, theCode);
    if(theUser1["_id"].toString() !== theUser2["_id"].toString()) {
      console.log("Database error. User object returned by checkPassword does \
        not match user object returned by checkCode.");
      return false;
    }
    let theEvents = await eventData.getEventsByClass(theUser1.class);
    activeUser = theUser1["email"];
    res.render(path.resolve("static/homepage.handlebars"), {user: theUser1, events: theEvents});
  }
  catch(e) {
    res.render(path.resolve("static/accounterror.handlebars"), 
      {error: "Verify account error: " + e});
  }
});
router.route("/logout").post(async (req, res) => {
  activeUser = false;
  res.render(path.resolve("static/landingpage.handlebars"));
});
router.route("/myaccount").post(async (req, res) => {
  res.render(path.resolve("static/accounterror.handlebars"));
});
router.route("/myprofile").post(async (req, res) => {
  let theUser = await userData.getUserByEmail(activeUser);
  let theClass = userData.getClass(theUser);
  let verified = "No";
  if(theUser["verified"]) {
    verified = "Yes";
  }
  res.render(path.resolve("static/profile.handlebars"), {user: theUser, class: theClass, verified: verified});
});
router.route("/searchevents").post(async (req, res) => {
 //Not done yet 
});
router.route("/createevent").post(async (req, res) => {
 res.render(path.resolve("static/create.handlebars"));
});
router
  .route('/events')
  .get(async (req, res) => {
    //retrieve a list of all events
    try {
      const eventList = await eventData.getAllEvents();
      return res.json(eventList);
    } catch (e) {
      return res.status(500).json({ error: e });
    }
  })
  .post(async (req, res) => {
    //create a new event after validating inputs
    const eventData = req.body;
    //make sure there is something present in the req.body
    if (!eventData || Object.keys(eventData).length === 0) {
      return res
        .status(400)
        .json({ error: 'There are no fields in the request body' });
    }
    //check all inputs, that should respond with a 400
    try {
      eventData.title = helpers.checkString(eventData.name, 'Event Title');
      eventData.date = helpers.checkString(eventData.date, 'Event Date');
      eventData.location = helpers.checkString(eventData.location, 'Location');
      let theUser = await userData.getUserByEmail(activeUser);
      let theId = actveUser["_id"];
      //eventData.organizerId = helpers.checkId(eventData.organizerId, 'Organizer ID');
    } catch (e) {
      return res.status(400).json({ error: e });
    }

    //insert the event
    try {
      const { title, date, location, organizerId } = eventData;
      const newEvent = await eventData.addEvent(title, date, location, organizerId);
      return res.json(newEvent);
    } catch (e) {
      return res.status(500).json({ error: e });
    }
  });


router
  .route('/events:id')
  .get(async (req, res) => {
    //retrieve a specific event by ID
    //check inputs that produce 400 status
    try {
      req.params.id = helpers.checkId(req.params.id, 'Event ID URL Param');
    } catch (e) {
      return res.status(400).json({ error: e });
    }
    //try getting the event by ID
    try {
      const event = await eventData.getEventById(req.params.id);
      return res.json(event);
    } catch (e) {
      return res.status(404).json({ error: e });
    }
  })
  .put(async (req, res) => {
    //update an events details (all fields)
    const updatedData = req.body;
    //make sure there is something in the req.body
    if (!updatedData || Object.keys(updatedData).length === 0) {
      return res
        .status(400)
        .json({ error: 'There are no fields in the request body' });
    }
    //check all the inputs that will return 400 if they fail
    try {
      req.params.id = helpers.checkId(req.params.id, 'Event ID URL Param');
      updatedData.title = helpers.checkString(updatedData.title, 'Event Title');
      updatedData.date = helpers.checkString(updatedData.date, 'Event Date');
      updatedData.location = helpers.checkString(updatedData.location, 'Location');
      updatedData.organizerId = helpers.checkId(updatedData.organizerId, 'Organizer ID');
    } catch (e) {
      return res.status(400).json({ error: e });
    }
    //try to update the event
    try {
      const updatedEvent = await eventData.updateEventPut(req.params.id, updatedData);
      return res.json(updatedEvent);
    } catch (e) {
      return res.status(404).json({ error: e });
    }
  })
  .patch(async (req, res) => {
    //update specific fields of an event (partially update)
    const requestBody = req.body;
    //check to make sure there is something in req.body
    if (!requestBody || Object.keys(requestBody).length === 0) {
      return res
        .status(400)
        .json({ error: 'There are no fields in the request body' });
    }
    //check the inputs that will return 400 if fail
    try {
      req.params.id = helpers.checkId(req.params.id, 'Event ID');
      if (requestBody.title)
        requestBody.title = helpers.checkString(requestBody.title, 'Event Title');
      if (requestBody.date)
        requestBody.date = helpers.checkString(requestBody.date, 'Event Date');
      if (requestBody.location)
        requestBody.location = helpers.checkString(requestBody.location, 'Location');
      if (requestBody.organizerId)
        requestBody.organizerId = helpers.checkId(requestBody.organizerId, 'Organizer ID');
    } catch (e) {
      return res.status(400).json({ error: e });
    }
    //try to perform update
    try {
      const updatedEvent = await eventData.updateEventPatch(req.params.id, requestBody);
      return res.json(updatedEvent);
    } catch (e) {
      return res.status(404).json({ error: e });
    }
  })
  .delete(async (req, res) => {
    //delete an event by ID
    //check the id
    try {
      req.params.id = helpers.checkId(req.params.id, 'Event ID URL Param');
    } catch (e) {
      return res.status(400).json({ error: e });
    }
    //try to delete event
    try {
      const deletedEvent = await eventData.removeEvent(req.params.id);
      return res.json(deletedEvent);
    } catch (e) {
      return res.status(404).json({ error: e });
    }
  });
router.route("/viewcreatedevents").get(async (req, res) => {
  if(!activeUser) {
    res.render(path.resolve("/static/landingpage.handlebars"));
  }
  let theUser = await userData.getUserByEmail(activeUser);
  let myEvents = theUser.createdEvents;
  //This doesn't work and I can't figure out why. Hopefully figure out before the weekend
  res.render(path.resolve("/static/myCreatedEvents.handlebars"), {events: myEvents});
});
router.route("/viewevent:id").get(async (req, res) => {
  if(!activeUser) {
    res.render(path.resolve("/static/landingpage.handlebars"));
  }
  let created = false;
  let eventId = req.params.id;
  let theEvent = await eventData.getEventByID(eventId);
  let theUser = userData.getUserByEmail(activeUser);
  let userId = theUser._id;
  if(userId === eventId) {
    created = true;
  }
  let registered = false;
  let registeredEvents = theUser.registeredEvents;
  for(let a = 0; a < registeredEvents.length; a++) {
    let tempEvent = registeredEvents[a];
    if(tempEvent._id === eventId) {
      registered = true;
      break;
    }
  }
  return res.status(400).json({error: "Need to add a line to render the specific event \
    handlebars at the bottom of routes.js"});
  //You can change this line to be how you want.
  res.render(path.resolve("/static/viewevent.handlebars"), 
  {event: theEvent, created: created, registered: registered});
});


export default router;