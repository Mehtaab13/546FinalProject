import theRoute from "./routes.js";
const constructorMethod = (app) => {
    app.use("/", theRoute); //Sends user to landing page.
    app.use("/signup", theRoute); //Sends user to signup page.
    app.use("/login", theRoute); //Sends user to login page.
    app.use("/createaccount", theRoute); //Creates new user object, sends account verification email, and sends user to account verification page.
    app.use("/checkpassword", theRoute); //Logs user in and sends them to homepage.
    app.use("/sendveremail", theRoute) //Sends user to account verification page. Optionally sends them a new verification email.
    app.use("/sendpasswdemail", theRoute); //Sends user to change password page. Optionally sends them a new password via email
    app.use("/verifyemail", theRoute); //Checks account verification code, logs them in and sends them to homepage. 
    app.use("/changepassword", theRoute); //Changes user's password, logs them in and sends then to homepage.
    app.use("/myprofile", theRoute); //Sends user to their profile page. (Not done yet)
    app.use("/searchevents", theRoute); //Sends user to the search events page. (Not done yet)
    app.use("/createevent", theRoute); //Sends user to the create event page
    app.use("/events", theRoute);
    app.use("/viewevent", theRoute);
    app.use("viewcreatedevents", theRoute);
    app.use('*', (req, res) => {
      res.status(404).json({error: 'Not found'});
    });
  };
  
export default constructorMethod;