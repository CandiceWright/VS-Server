//database setup
var mysqldb = require('mysql');
var bcrypt = require('bcrypt');
// var con = mysqldb.createConnection({
//   host: "vshootdb.cnubl3lw5gjo.us-west-2.rds.amazonaws.com",
//   user: "root",
//   password: "4912bU!L9",
//   database: "vshootDB"
// });

// con.connect(function(err) {
//   if (err) throw err;
//   console.log("Connected!");
// });

var db_config = {
  host: "vshootdb.cnubl3lw5gjo.us-west-2.rds.amazonaws.com",
  user: "root",
  password: "4912bU!L9",
  database: "vshootDB"
}
var con;

function handleDisconnect() {
  con = mysqldb.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  con.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  con.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();


//for sending mail
var nodemailer = require('nodemailer');

//video setup
//const oldSecret = 'vC2mfB4NMXhIJFD6ChElrz0QJAsszzke'
//const old sid = 'SK2c96f8cec4481c864a42db2cf8cdfca9'

const authToken = 'b6b5a782e16b67b5fefde5724aedd46d';
//var accountSid = 'SK39b3a4c5eb32b1fc71eccb794c913151';
const accountSid = 'AC009c1700c99bed47dccb38ba735672a8';
const apiSecret = 'cTXJ5TkdGlcLUMXJgyzchGQBjFlORdLb';
const apiKey = 'SK39b3a4c5eb32b1fc71eccb794c913151';

const client = require('twilio')(accountSid, authToken);
var AccessToken = require('twilio').jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;

//firebase auth setup
var admin = require("firebase-admin");
//vs-app-5ce8f-firebase-adminsdk-zba1j-49ec64281e.json
var serviceAccount = require("./vs-app-5ce8f-firebase-adminsdk-zba1j-49ec64281e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//server setup 
var express = require('express');
var app = express(); 
var bodyParser = require('body-parser');
app.use(bodyParser.json());
// var port = process.env.PORT || 8081;
var server = app.listen(7343, listen); 


function listen(){
	console.log("listening..."); //server waiting for connections
}

app.get('/test', proof); 

function proof(request,response){
	response.send("Hi I am working. What do you need.");
}

//password encryption functions
//encryption 
function encrypt(password){
	return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
}

function decrypt(givenPassword, actualPassword){
	return bcrypt.compareSync(givenPassword, actualPassword);
}

function getUserToken(uidNum, callback){
  //const uid = 'some-uid'
  uid = "'" + uidNum + "'"
  admin.auth().createCustomToken(uid)
  .then((customToken) => {
    console.log(customToken);
    callback(customToken);
  })
  .catch((err) => {
    console.log("error creating token", err);
  })
}

/****************** Login/Signup and Logout Routes **********************/

app.post('/signup', signUp);
function signUp(request, response){
	//console.log(response.body);
	console.log(request);
	console.log(request.params);
	var data = request.body;
	var username = data.username;
	console.log(username);
	var password = data.password;
	encryptedPass = encrypt(password);
	var email = data.email;
  //var pin = data.pin;
  //var pinEncr = encrypt(pin);
  //var sqa =  data.securityAnswer;
  //encryptedSQA = encrypt(sqa);
	// con.connect(function(err) {
        var query1 = "INSERT INTO Users (email, username,uPassword, profilePic, vsPreference) VALUES (" + "'" + email + "'," + "'" + username + "'," + "'" + encryptedPass + "'," + "'none'," + "'" + "1" + "'"  + ");"
        con.query(query1, function (err2, result, fields) {
  
          if (!err2){
            
            console.log(result);
            console.log("signup successful");
            //do a second query to get the userId you just created
            var query2 = "SELECT * FROM Users WHERE username = " + "'" + username + "'";
            con.query(query2, function(err3, result2, fields2){
              if (!err3){
                //console.log("I had no error")
                console.log(result2)
                var userId = result2[0].userId;
                console.log(userId)
                getUserToken(userId, function(newtoken){
                  //console.log(newtoken)
                  response.setHeader('Access-Control-Allow-Origin', '*');
                  // Request methods you wish to allow
                  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
                  response.statusCode = 200;
                  response.send(newtoken);
                });
              }
              else {
                //console.log("I had an error")
                console.log("couldnt get uid");
                response.setHeader('Access-Control-Allow-Origin', '*');
                // Request methods you wish to allow
                response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
                response.statusCode = 404;
                console.log(err2);
                response.send("failed to signup");
              }
            })
            
          }
          else {
            response.setHeader('Access-Control-Allow-Origin', '*');
            // // Request methods you wish to allow
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            response.statusCode = 200;
            console.log(err2);
            response.send("username taken");
          }
        });
    // }); 

}

app.post('/login', validateLogin);
function validateLogin(request, response){
  //first check if they are logged in on another device
    
    var data = request.body;
    var username = data.username;
    console.log(username);
    var password = data.password;

    var loggedInAlready = false;
    var index;
    for (var i=0; i < allUsers.length; i++){
      if(allUsers[i].username == username){
        //user is logged in on aother device
        loggedInAlready = true;
        index = i;
        break;
      }
    }

    if (loggedInAlready){
      console.log("removing previously logged in user instance");
      allUsers.splice(index, 1);
    }

    //else {
      con.connect(function(err) {
        var query1 = "SELECT * FROM Users WHERE username = " + "'" + username + "'";
        con.query(query1, function (err2, result, fields) {
        
          if (!err2){
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            response.statusCode = 200
            console.log(result);
            if (result.length == 0){
              console.log("no user exists");
              response.send("no user exists");
            }
            else {
              if (decrypt(password, result[0].uPassword)){
              console.log("Successful login")
              console.log(result);
              //token = 
              var userId = result[0].userId;
              //console.log(userId)
              getUserToken(userId, function(newtoken){
                console.log(newtoken)
                response.send(newtoken);
              });
            }
              else {
                console.log("wrong password");
                response.send("wrong password");
              }
            }
            
          }
          else {
            console.log(err2);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            response.statusCode = 404;
            response.send("failed");
          }
        });
      });
    //}

    
}

app.post('/logout', logout);
function logout(request, response){
  console.log("I am in logout function")
  data = request.body;
  var username = data.username;
  var foundUser = false;
  var index;
    for (i=0; i < allUsers.length; i++){
      console.log(allUsers[i].username)
      if (allUsers[i].username == username){
        foundUser = true;
        index = i;
        break;
      }
    }
  if (foundUser){
    allUsers.splice(index, 1);
    for (i=0; i < allUsers.length; i++){
      console.log(allUsers[i].username)
    }

  }
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  response.statusCode = 200;
  response.send("logout successful");
  
}


/************* Forgot Username/Password ******************/

app.post('/forgotPass', forgotPassword);
function forgotPassword(request, response){
  data = request.body;
  var username = data.username;
  //get their email
  var query = "SELECT * FROM Users WHERE username = " + "'" + username + "'";
  con.query(query, function(err, result, fields){
    if (!err){
      if (result.length == 0){ //no user
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.statusCode = 200;
        response.send("no user exists");
      }
      else {
        var email = result[0].email;
        //generate random code
         var code = Math.floor(100000 + Math.random() * 900000)
         var encryptCode = encrypt(code.toString())
        //send email
        var transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'noreply@thevshoot.com',
            pass: 'vS8535bl@nk'
          }
        });

        emailMsg = 'Here is your unique code for reseting your password: ' + code + '. Navigate back to the app and enter this code to complete your password reset.'

        var mailOptions = {
          from: 'noreply@thevshoot.com',
          to: email,
          subject: 'VShoot Password Reset',
          text: emailMsg
        };

        transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            console.log(error);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            response.statusCode = 200;
            response.send("could not send email");
          } else {
            //save code to db
            var pinCreatedDate = new Date()
            pinCreatedDateStr = pinCreatedDate.toString()
            var query = "UPDATE Users SET pin = '" + encryptCode + "' , pinCreationDate = '" + pinCreatedDateStr + "' " + "WHERE username = '" + username + "'";
            //var query = "UPDATE Users SET pin = '" + code + "'" + " WHERE username = '" + username + "'";
            console.log(query)
            con.query(query, function(err2, result2, field2){
              if (!err2){
                console.log(result2); //for now just log result to see format
                console.log('Email sent: ' + info.response);
                response.setHeader('Access-Control-Allow-Origin', '*');
                response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
                response.statusCode = 200;
                response.send("email successfully sent");
              }
              else {
                console.log(err2);
                response.setHeader('Access-Control-Allow-Origin', '*');
                response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
                response.statusCode = 404;
                response.send("server trouble");
              }
            })

          }
        });
      }
    }
    else {
      //console.log("I had an error")
      console.log(err);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("failed to get username");
    }
  })
}


app.post('/user/pin/validate', validatePin);
function validatePin(request,response){
  console.log("I am in get userId function");
  var data = request.body
  var username = data.username
  var givenPin = data.pin
  //con.connect(function(err){
  var query = "SELECT * FROM Users WHERE username = " + "'" + username + "'";
  con.query(query, function(err2, result, fields){
    if (!err2){
      //console.log("I had no error")
      console.log(result)
      var pin = result[0].pin;
      if (decrypt(givenPin, pin)){
        //check if its expired
        var pinCreated = result[0].pinCreationDate;
        var storedDate = new Date(pinCreated)
        var expiredDate = storedDate
        expiredDate.setHours(storedDate.getHours() + 1);
        var currentDate = new Date()
        if (currentDate > expiredDate){
          //expired
          response.setHeader('Access-Control-Allow-Origin', '*');
          response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
          response.statusCode = 200;
          response.send("pin expired");
        }
        else {
          //all good
          response.setHeader('Access-Control-Allow-Origin', '*');
          response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
          response.statusCode = 200;
          response.send("correct pin");
        }
      }
      else {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.statusCode = 200;
        response.send("incorrect pin");
      }
      
    }
    else {
      //console.log("I had an error")
      console.log(err2);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("Server fail");
    }
  })
  //})
}

app.post('/user/password', changePassword);
function changePassword(request, response){

  var data = request.body;
  var username = data.username;
  var newPass = data.newPass; 
  console.log(newPass)
  encryptedPass = encrypt(newPass);
  console.log("in change password with user: " + data.username)

  var query = "UPDATE Users SET uPassword = '" + encryptedPass + "'" + "WHERE username = '" + username + "'";

  con.query(query, function(err, result, field){
    if (!err){
      console.log(result); //for now just log result to see format
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 200;
      response.send("password updated successfully");
    }
    else {
      console.log(err);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("password could not be updated");
    }
  }) 
}

app.post('/user/getusername', getUsername);
function getUsername(request, response){
  var data = request.body;
  var email = data.email;
  console.log(email)
  var givenPassword = data.password;

  var query = "SELECT * FROM Users WHERE email = " + "'" + email + "'";
  console.log(query)
  con.query(query, function(err2, result, fields){
    if (!err2){
      //console.log("I had no error")
      console.log(result)
      if (result.length == 0){
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.statusCode = 200;
        response.send("email doesn't exist");
      }
      else {
        //shouldn't be more than 1 match
        var storedPassword = result[0].uPassword;
        if (decrypt(givenPassword, storedPassword)){
          response.setHeader('Access-Control-Allow-Origin', '*');
          response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
          response.statusCode = 200;
          response.send(result[0].username);
        }
        else {
          response.setHeader('Access-Control-Allow-Origin', '*');
          response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
          response.statusCode = 200;
          response.send("wrong password");
        }
        
      }
      
    }
    else {
      //console.log("I had an error")
      console.log(err2);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("server error");
    }
  })

}


/****************** Change Profile Information (username, email, profile_pic, preferences) ********************/

app.post('/newProfilePic', addNewProfilePic);
function addNewProfilePic(request, response){
  var data = request.body;
  var username = data.username;
  var url = data.url;
  var query = "UPDATE Users SET profilePic = '" + url + "'" + "WHERE username = '" + username + "'";

  con.query(query, function(err, result, field){
    if (!err){
      console.log(result); //for now just log result to see format
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 200;
      response.send("profile picture added successfully");
    }
    else {
      console.log(err);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("profile picture could not bee added");
    }
  })
}

app.post('/user/username', changeUsername);
function changeUsername(request, response){
  console.log("I am in change username func")
  var data = request.body;
  var oldUN = data.currUsername;
  var newUN = data.newUsername;
  var query = "UPDATE Users SET username = '" + newUN + "'" + "WHERE username = '" + oldUN + "'";


  con.query(query, function(err, result, field){
    if (!err){
      var foundUser = false;
      var index;
      for (i=0; i < allUsers.length; i++){
        console.log("'" + allUsers[i].username + "'")
        console.log("'" + oldUN + "'" )
        if (allUsers[i].username == oldUN){ //oldUN was username but what is username
          console.log("found user")
          foundUser = true;
          index = i;
          //break;
        }
      }
      if (foundUser){
        console.log("changing username in server array")
        allUsers[index].username = newUN
        console.log(result); //for now just log result to see format
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.statusCode = 200;
        response.send("username updated successfully");
      }
      else {
        console.log("couldnt find user")
        console.log(err);
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.statusCode = 404;
        response.send("username could not be updated")
      }
    }
    else {
      console.log("username taken")
      console.log(err);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 200;
      response.send("username taken");
    }
  })

}

app.post('/user/email', changeEmail);
function changeEmail(request, response){
  var data = request.body;
  var user = data.currUser;
  var newEM = data.newEmail;
  var query = "UPDATE Users SET email = '" + newEM + "'" + "WHERE username = '" + user + "'";

  con.query(query, function(err, result, field){
    if (!err){
      console.log(result); //for now just log result to see format
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 200;
      response.send("email updated successfully");
    }
    else {
      console.log(err);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("email could not be updated");
    }
  })

}

app.post('/user/preference', updatePreference);
function updatePreference(request, response){
  var data = request.body;
  var user = data.currUser;
  var newPref = data.newPref;
  var query = "UPDATE Users SET vsPreference = '" + newPref + "'" + "WHERE username = '" + user + "'";

  con.query(query, function(err, result, field){
    if (!err){
      console.log(result); //for now just log result to see format
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 200;
      response.send("preference updated successfully");
    }
    else {
      console.log(err);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("preference could not be updated");
    }
  })

}

/******************* Get Profile Information ********************/


app.get('/user/profilePic/:username', getProfilePic);
function getProfilePic(request, response){
  console.log("I am in get profile pic function")
  var username = request.params.username
  var query = "SELECT * FROM Users WHERE username = " + "'" + username + "'";
  con.query(query, function(err2, result, fields){
    if (!err2){
      //console.log("I had no error")
      //console.log(result)
      var profilePic = result[0].profilePic;
      console.log(profilePic);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 200;
      //if (profilePic == null){
      if (profilePic == "none"){
        //no profile pic chosen
        console.log("no profile pic");
        var strRes = "no profile pic";
        response.send(strRes);
      }
      else {
        console.log(profilePic)
        //var picStr = '"' + profilePic + '"'
        response.send(profilePic);
      }
    }
    else {
      //console.log("I had an error")
      console.log(err2);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("failed to get profilePic");
    }
  })
}

app.get('/user/preference/:username', getPreference);
function getPreference(request, response){
  var username = request.params.username
  var query = "SELECT vsPreference FROM Users WHERE username = " + "'" + username + "'";
  con.query(query, function(err2, result, fields){
    if (!err2){
      
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 200;
      //respStr = '"' + result[0].vsPreference + '"'
      respStr = (result[0].vsPreference).toString()
      console.log(respStr)
      response.send(respStr)
    }
    else {
      //console.log("I had an error")
      console.log(err2);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("failed to get preference");
    }
  })

}


app.get('/user/:username', getUserId);
function getUserId(request,response){
  console.log("I am in geet userId function");
  var username = request.params.username
  //con.connect(function(err){
  var query = "SELECT * FROM Users WHERE username = " + "'" + username + "'";
  con.query(query, function(err2, result, fields){
    if (!err2){
      //console.log("I had no error")
      console.log(result)
      if (result.length == 0){
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.statusCode = 404;
        response.send("failed to get userId");
      }
      else {
        var userId = result[0].userId;
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.statusCode = 200;
        console.log(userId)
        var idString = '"' + userId + '"'
        response.send(idString);
      }
      
    }
    else {
      //console.log("I had an error")
      console.log(err2);
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      response.statusCode = 404;
      response.send("failed to get userId");
    }
  })
  //})
}

app.get('/users', getAllUsers);
function getAllUsers(request, response){
  con.connect(function(err) {
    var query1 = "SELECT username, profilePic FROM Users"
        //var query1 = "SELECT * FROM Users;"
        con.query(query1, function (err2, result, fields) {
        
          if (!err2){
        
            console.log(result); //for now just log result to see format
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            response.statusCode = 200;
            response.send(result);
            
          }
          else {
            console.log(err2);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            response.statusCode = 404;
            response.send("failed");
          }
        });
    });
}

/**************** Friends Routes **********************/

function changeToFriendArray(result, callback){
  console.log(result);
	var friends = [];
  if (result.length == 0){
    callback(friends);
  }
  else {
    for (let i = 0; i < result.length; i++) {
    console.log("i: " + i);
    var query = "SELECT * FROM Users WHERE userId = " + "'" + result[i].friend2 + "'";
    con.query(query, function(err, result2, fields2){
      if (!err){
        console.log("result2 in change array")
        console.log(result2)
        //console.log(result2[i])
        var un = result2[0].username
        var pic = result2[0].profilePic
        //if (pic == null){
          //pic = "none";
        //}
        //eventually add photo
        var friendjson = {
          "username" : un,
          "pic" : pic
        }
        console.log("about to push to array")
        friends.push(friendjson)
        console.log("done with for loop maybe");
        console.log(friends.length);
        console.log(result.length);
        if (friends.length == result.length){
          callback(friends);
          console.log("about to return");
          //return;
        }
              
      }
      else {
        console.log("error getting friend info");
      }
    })
  }
  }
}

app.get('/friends/:username', returnFriends);
function returnFriends(request, response){
	username = request.params.username;
  console.log(username)
	// var friends = [];
	//first get the id of the user
	con.connect(function(err){
		var query = "SELECT * FROM Users WHERE username = " + "'" + username + "'";
		con.query(query, function(err2, result, fields){
			if (!err2){
				userId = result[0].userId;
				var query2 = "SELECT * FROM Friends WHERE friend1 = " + userId
				con.query(query2, function(err3, result2, fields2){
					if (!err3){
						// //everything went ok
						// //for now just log the result to see the format
						 console.log(result2)
						// //go  through results and get username infor for each
						changeToFriendArray(result2 , function(friendsArr){
							console.log(friendsArr)
							//decide whether you need to stringify the result before sending
							response.setHeader('Access-Control-Allow-Origin', '*');
            				response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
							response.statusCode = 200;
							response.send(friendsArr);
						})
						
					}
					else {
						console.log(err3)
						response.setHeader('Access-Control-Allow-Origin', '*');
            			// Request methods you wish to allow
            			response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
						response.statusCode = 404;
						response.send("failed to return friends")
					}
				})
			}
			else {
				console.log(err2);
				response.setHeader('Access-Control-Allow-Origin', '*');
            	// Request methods you wish to allow
            	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
				response.statusCode = 404;
				response.send("failed");
			}
		})
	})
}

app.post('/addfriends', addFriends);
function addFriends(request, response){
	//expect to get two usernames: current user and the friend added
	var data = request.body;
	var currentUser = data.currentUser;
	var addedFriend = data.addedFriend;

	//first check to see if they are already friends

	//now get both of their ids
	con.connect(function(err){
		var query = "SELECT * FROM Users WHERE username = " + "'" + currentUser + "'";
		con.query(query, function(err2, result, fields){
			if (!err2){
				userId1 = result[0].userId;
				var query2 = "SELECT * FROM Users WHERE username = " + "'" + addedFriend + "'";
				con.query(query2, function(err3, result2, fields2){
					if (!err3){
						userId2 = result2[0].userId;
						//now you can insert new friendship into table
						var query3 = "INSERT INTO Friends (friend1, friend2) VALUES (" + "'" + userId1 + "'," + "'" + userId2 + "'" + ");"
						con.query(query3, function(err4, result3, fields3){
							if (!err4){ //successful insertion
								response.setHeader('Access-Control-Allow-Origin', '*');
            					// Request methods you wish to allow
            					response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            					console.log("addedFriend successful");
            					response.statusCode = 200;
            					response.send("added friend successfully");
							}
							else {
								response.setHeader('Access-Control-Allow-Origin', '*');
            					// Request methods you wish to allow
            					response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            					response.statusCode = 404;
            					console.log(err4);
            					response.send("failed");
							}
						})
					}
					else {
						response.setHeader('Access-Control-Allow-Origin', '*');
            			// Request methods you wish to allow
            			response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
						console.log(err3)
            response.statusCode = 404;
						response.send("failed")
					}
				})
			}
			else {
				response.setHeader('Access-Control-Allow-Origin', '*');
        // Request methods you wish to allow
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
				console.log(err2);
        response.statusCode = 404;
				response.send("failed");
			}
		})
	})

}

app.post('/deleteFriend', deleteFriend);
function deleteFriend(request, response){
  var data = request.body;
  var currentUser = data.currentUser;
  var deletedFriend = data.deletedFriend;
//var query = "DELETE FROM Friends WHERE username = " + "'" + currentUser + "'";
  //first get userId for both users
  con.connect(function(err){
    var query = "SELECT * FROM Users WHERE username = " + "'" + currentUser + "'";
    con.query(query, function(err2, result, fields){
      if (!err2){
        var currUserId = result[0].userId;
        var query2 = "SELECT * FROM Users WHERE username = " + "'" + deletedFriend + "'";
        con.query(query2, function(err3, result2, fields2){
          if (!err3){
            var deletedFriendId = result2[0].userId;
            var query3 = "DELETE FROM Friends WHERE friend1 = " + "'" + currUserId + "'" + "AND friend2 = " + "'" + deletedFriendId + "'";
            con.query(query3, function(err4, result3, fields3){
              if (!err4){
                console.log("deleted friend")
                response.setHeader('Access-Control-Allow-Origin', '*');
                // Request methods you wish to allow
                response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
                response.statusCode = 200;
                response.send("deleted friend successfully");
              }
              else {
                response.setHeader('Access-Control-Allow-Origin', '*');
                // Request methods you wish to allow
                response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
                console.log(err4);
                response.statusCode = 404;
                response.send("failed");
              }
            })
          }
          else {
            response.setHeader('Access-Control-Allow-Origin', '*');
            // Request methods you wish to allow
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            console.log(err3);
            response.statusCode = 404;
            response.send("failed");
          }
        })
      }
      else {
        response.setHeader('Access-Control-Allow-Origin', '*');
        // Request methods you wish to allow
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        console.log(err2);
        response.statusCode = 404;
        response.send("failed");
      }
     
    })
  })
}

/********************** VShoot Logic (Including Classes and Sockets) **************/

//start vshoot logic
//create a main socket channel for all users to connect 
var socket = require('socket.io');
var socketChannel = socket(server);
var allUsers = [];
var currentvshoots = [];
var waitingForUsers = []; //a list of usernames that are apart of a vshoot that has been canceled by other user. waiting for them to enter back into app to notify them

function generateAccessToken(username, roomName, callback){
  // Create Video Grant
  const videoGrant = new VideoGrant({
    room: roomName,
  });

  const token = new AccessToken(accountSid, apiKey, apiSecret);
  token.addGrant(videoGrant);
  token.identity = username;

  callback(token.toJwt())
}

//listen for new connections on this socket
socketChannel.sockets.on('connection', function(socket){
  console.log("new connection");
  console.log(socket.id);
  //socket.emit("new connection");
  //socket.emit("successfully connected");
  for (i=0; i < allUsers.length; i++){
    if (allUsers[i].socket.id == socket.id){
      console.log("updating socket");
      allUsers[i].socket = socket;
    }
  }
  socket.on('disconnect', function(socket){
    console.log("disconnecting")
  })
  socket.on("join", function(username){ //when this socket emits a new user event, do the following 
    console.log("storing a new user with username " + username + "and socket " + socket.id);
    var exists = false;
    var index;
    for (i=0; i < allUsers.length; i++){
      if (allUsers[i].username == username){
        console.log("updating socket");
        exists = true;
        allUsers[i].socket = socket
        index = i;
      }
    }
    
    //check to see if user is currently in a vshoot, if so, update socket ref
    var notInVS = true
    for(i=0; i < currentvshoots.length; i++){
      console.log("For vshoot " + i + "the votographer is " + currentvshoots[i].votographer.username + "and the vmodel is " + currentvshoots[i].vmodel.username)
      if(currentvshoots[i].votographer.username == username){
        console.log("updating votographer socket")
        notInVS = false;
        currentvshoots[i].votographer.socket = socket;
        //also notify vmodel that they're back
        currentvshoots[i].vmodel.socket.emit("votographerIsBack");
        
      }
      else if(currentvshoots[i].vmodel.username == username){
        console.log("updating vmodel socket")
        notInVS = false
        currentvshoots[i].vmodel.socket = socket;
        //also notify votographer that they're back
        currentvshoots[i].votographer.socket.emit("vmodelIsBack")
        
      }
    }

    if(notInVS){ //check to see if server was waiting on them to come back for end notification
      for(i=0; i < waitingForUsers.length; i++){
        if (waitingForUsers[i] == username){
          console.log("vshoot is already cancelled now")
          socket.emit("VShootEnded", "vs is ending");
        }
      }

    }

    if (!exists){
      var newUser = new User(username, socket);
      allUsers.push(newUser);
    }

    console.log("printing listen count for join")
    console.log(socket.listenerCount('join'))
    
  });

  //listen for app going to background
  socket.on("goingToBackground", function(username){
    //check to see if that user is currently in a vshoot
    for(i=0; i < currentvshoots.length; i++){
      if(currentvshoots[i].votographer.username == username){
        //notify other vshooter that they are going to the background
        console.log("votographer is going to background")
        currentvshoots[i].vmodel.socket.emit("votographerInBackground");
        //break;
      }
      else if(currentvshoots[i].vmodel.username == username){
        //notify other vshooter that they are going to the background
        console.log("vmodel is going to background")
        currentvshoots[i].votographer.socket.emit("vmodelInBackground");
        //break;
      }
    }
  })

  //new vs request 
  socket.on("startVshoot", function(data){
    console.log("new vs request from " + data.sender + " with socket " + socket.id + " to " + data.receiver + " at " + data.date);
    //console.log("new vs request from " + requestor + " to " + requestee + " at " + time);
    //declare a new vshoot and add the requestor to that vshoot
    var requestor = data.sender;
    var receiver = data.receiver;
    var date = data.date;
    var requestorRole = data.senderRole;
    

    //first check to see if the receiver of this request is friends with the requestor
    //if not, check receiver preferences
    //if receiver accepts requests only from their friends, send back an error. Else, proceed to check if receiver is online

    var query = "SELECT * FROM Users WHERE username = " + "'" + receiver + "'";
    con.query(query, function(err2, result, fields){
      if (!err2){
        userId = result[0].userId;
        console.log(userId)
        var query2 = "SELECT * FROM Users WHERE username = " + "'" + requestor + "'";
        con.query(query2, function(err3, result2, fields2){
          if (!err3){
            userId2 = result2[0].userId;
            console.log(userId2)
            var query3 = "SELECT * FROM Friends WHERE friend1 = " + userId + " AND friend2= " + userId2
            con.query(query3, function(err4, result3, fields3){
              if (!err4){
                console.log(result3)
                if(result3.length != 0){ //receiver has this person as a friend so its fine
                  

                  var requesteeSocket;
                  var foundUser = false;
                  for (i=0; i < allUsers.length; i++){
                    if (allUsers[i].username == receiver){
                      console.log(allUsers[i].username)
                      foundUser = true;
                      requesteeSocket = allUsers[i].socket;
                      console.log("requesteeSocket: " + requesteeSocket.id);
                    }
                  }

                  if (foundUser){
                    if (requesteeSocket.connected){
                      console.log("found a connected user")
                      //get the role of the receiver
                      var receiverRole;
                      if (requestorRole == "votographer"){
                        receiverRole = "vmodel";
                      }
                      else {
                        receiverRole = "votographer";
                      }
                      var id = currentvshoots.length;
                      var vs = new Vshoot(id);
                      currentvshoots.push(vs);
                      //var vsId = currentvshoots.length - 1;
                      //var vshooter = new Vshooter(socket, requestor, vs, requestorRole);
                      vs.addVshooter(new Vshooter(socket, requestor, vs, requestorRole));
                      requesteeSocket.emit("newVSRequest", {
                        vshootId: vs.getID(),
                        vshootRequestor: requestor,
                        receiverRole: receiverRole
                      })
                    }
                    else {
                      console.log("socket closed")
                      socket.emit("UserOffline", "There is no user connected with that username")
                    }
                    
                  }
                  else {
                    console.log("no user found")
                    socket.emit("UserOffline", "There is no user connected with that username")
                  }
                }
                else { //they are not friends so check receivers preferences
                  var query = "SELECT vsPreference FROM Users WHERE username = " + "'" + receiver + "'";
                  con.query(query, function(err2, result, fields){
                    if (!err2){  
                      pref = result[0].vsPreference
                      console.log(pref)
                      if (pref == 1){
                        //tell requestor they cannot shoot with this person because the other person does'nt have them as a friend
                        console.log("receiver doesn't have them as a friend and they only allow friends")
                        socket.emit("OnlyVotographriends", "Your request could not be completed because " + receiver + " only accepts VShoot requests from their vriends and they have not added you yet. Contact them to add you, then you'll be good!")
                      }
                      else {
 

                        var requesteeSocket;
                        var foundUser = false;
                        for (i=0; i < allUsers.length; i++){
                          if (allUsers[i].username == receiver){
                            foundUser = true;
                            requesteeSocket = allUsers[i].socket;
                            console.log("requesteeSocket: " + requesteeSocket);
                          }
                        }

                        if (foundUser){
                          //get the role of the receiver
                          	var receiverRole;
                          	if (requestorRole == "votographer"){
                            	receiverRole = "vmodel";
                          	}
                          	else {
                            	receiverRole = "votographer";
                          	}
                          	var id = currentvshoots.length;
    						var vs = new Vshoot(id);
    						currentvshoots.push(vs);
    						//var vsId = currentvshoots.length - 1;
    						//var vshooter = new Vshooter(socket, requestor, vs, requestorRole);
    						vs.addVshooter(new Vshooter(socket, requestor, vs, requestorRole));
                          	requesteeSocket.emit("newVSRequest", {
                            	vshootId: vs.getID(),
                            	vshootRequestor: requestor,
                            	receiverRole: receiverRole
                          	})
                        }
                        else {
                          console.log("no user found")
                          socket.emit("UserOffline", "There is no user connected with that username")
                        }
                      }
                    }
                    else {
                      console.log("Could not get friendship between the two users")
                      socket.emit("VSRequestActionFailed", "It seems the vshoot has been cancelled.");
                    }
                  })

                }
              }
              else {

                console.log("Could not get friendship between the two users")
                console.log(err4)
                socket.emit("VSRequestActionFailed", "It seems the vshoot has been cancelled.");
              }
            })
          }
          else {
            console.log("could not get requestor id")
            socket.emit("VSRequestActionFailed", "It seems the vshoot has been cancelled.");
          }
        })
      }
      else {
        console.log("could not get receiver id")
        socket.emit("VSRequestActionFailed", "It seems the vshoot has been cancelled.");
      }
    })

    
    
  });

  socket.on("acceptVSRequest", function(data){
    vshootId = data.vsID;
    username = data.username; //username of the user who is accepting 
    console.log("username of person accepting: " + username)
    //first go through current vshoots to find one with this vshoot id
    var foundVshoot = false;
    var wantedVS;
    console.log("current length of vs: " + currentvshoots.length);
    console.log("wantedVS: " + vshootId);

    for (i=0; i < currentvshoots.length; i++){
      // console.log("currentvshoots[i].id: " + currentvshoots[i].id)
      // console.log()
      if (currentvshoots[i].id == vshootId){
        wantedVS = currentvshoots[i];
        foundVshoot = true;
      }
    }

    if (foundVshoot){
      var role;
      if (wantedVS.votographer == null){
        role = "votographer";
      }
      else {
        role = "vmodel";
      }
      //var newVshooter = new Vshooter(socket, username, wantedVS, role);
      wantedVS.addVshooter(new Vshooter(socket, username, wantedVS, role));
    }
    else {
      socket.emit("VSRequestActionFailed", "It seems the vshoot has been cancelled.");
    }
  })

  socket.on("declineVSRequest", function(data){
    vshootId = data.vsID;
    username = data.username; //username of the user who is declining
    var foundVshoot = false;
    var wantedVS;
    for (i=0; i < currentvshoots.length; i++){
      // console.log("currentvshoots[i].id: " + currentvshoots[i].id)
      // console.log()
      if (currentvshoots[i].id == vshootId){
        wantedVS = currentvshoots[i];
        foundVshoot = true;
      }
    }

    if (foundVshoot){
      //delete wantedVS;
      var d = new Date();
      var endTimeStr = d.toUTCString();
      vsIndex = findVShootIndex(vshootId)
      var role;
      if (wantedVS.votographer != null){ //notify votographer that user has declined
        wantedVS.votographer.socket.emit("UserDeclined");
        currentvshoots[vsIndex].votographer.vshoot.endTime = endTimeStr
      }
      else { //notify vmodel that user has declined
        wantedVS.vmodel.socket.emit("UserDeclined");
        currentvshoots[vsIndex].vmodel.vshoot.endTime = endTimeStr
      }
      
      currentvshoots[vsIndex].endTime = endTimeStr
    	currentvshoots.splice(vsIndex, 1);
  	  
    }
    else {
      socket.emit("VSRequestActionFailed", "It seems the vshoot has been cancelled.");
    }

  })

  socket.on("endVShoot", function(data){

    //need to know the user that needs to be notified that their vshoot is ending 
    vsId = data.vsID
    initiator = data.initiator //should be votographer or vmodel
    vshoot = findVShoot(vsId);
    if (vshoot != null){ //one was found with that id
      if(initiator == "vmodel"){
        console.log("vmodel is ending the vshoot");
        //first check to see if socket is connected
        if (vshoot.votographer.socket.connected){
          vshoot.votographer.socket.emit("VShootEnded", "vs is ending");
        }
        else {
          waitingForUsers.push(vshoot.votographer.username)
        }
        
      }
      else {
        console.log("votographer is ending vshoot");
        //first check to see if socket is connected
        if (vshoot.vmodel.socket.connected){
          vshoot.vmodel.socket.emit("VShootEnded", "vs is ending");
        }
        else {
          waitingForUsers.push(vshoot.vmodel.username)
        }
      }

      //add vshoot to db
	    var d = new Date();
	    var endTimeStr = d.toUTCString();
	    vshoot.endTime = endTimeStr;
	    var startTime = vshoot.startTime;
	    var votographerUN = vshoot.votographer.username;
	    var vmodelUN = vshoot.vmodel.username;

	    con.connect(function(err){
	      var query = "INSERT INTO VShoots (startTime, endTime, vmodel, votographer) VALUES (" + "'" + startTime + "'," + "'" + endTimeStr + "'," + "(SELECT userId FROM Users WHERE username = '" + vmodelUN + "')," + "(SELECT userId FROM Users WHERE username = '" + votographerUN + "')" + ")" ;
	      con.query(query, function(err2, result, fields){
	        if (!err2){
	          	console.log("successfully added new vs");
	          	//now delete vs from
	          	//delete vshoot;

      			vsIndex = findVShootIndex(vsId)
      			currentvshoots[vsIndex].endTime = endTimeStr
      			currentvshoots[vsIndex].vmodel.vshoot.endTime = endTimeStr
      			currentvshoots[vsIndex].votographer.vshoot.endTime = endTimeStr
      			 
	        	if (vsIndex != null){
    				  currentvshoots.splice(vsIndex, 1);
              console.log("currentvshoots number is " + currentvshoots.length)
  				  }
	          
	        }
	        else {
	          console.log(err2)
	        }
	      })
	    })
    }

    //remove take photo listener and cancelRequest listener
    socket.removeAllListeners('takephoto')
    socket.removeAllListeners('cancelRequest')
    console.log("printing socket events after ending shoot")
    console.log(socket.eventNames())


  })
});



function findVShoot(id){
  var wantedVS = null
  for (i=0; i < currentvshoots.length; i++){
      // console.log("currentvshoots[i].id: " + currentvshoots[i].id)
      // console.log()
      if (currentvshoots[i].id == vshootId){
        wantedVS = currentvshoots[i];
        foundVshoot = true;
      }
    }

    return wantedVS;
}

function findVShootIndex(id){
  var wantedVS = null
  for (i=0; i < currentvshoots.length; i++){
      // console.log("currentvshoots[i].id: " + currentvshoots[i].id)
      // console.log()
      if (currentvshoots[i].id == vshootId){
        wantedVS = i;
        foundVshoot = true;
      }
    }

    return wantedVS;
}

function User(username, socket) { //used soley to have a reference from all users to its socket
  this.username = username;
  this.socket = socket;
  console.log("printing the events on this socket for " + this.username + "in user constructor")
  console.log(this.socket.eventNames())
}

function Vshooter(socket, username, vshoot, role) { //only users that are currently vshooting will have this object
    var self = this
    this.socket = socket
    this.username = username
    this.vshoot = vshoot
    this.role = role
    this.didInitiate = false;

    this.socket.on("takephoto", function(data) {
      console.log(self.vshoot.endTime)
      if(self.vshoot.endTime == null){
      	flash = data.flash;
      	console.log("printing vmodel for take photo")
      	console.log(self.vshoot)
      	console.log("printing vmodel")
      	console.log(self.vshoot.vmodel)
      	self.vshoot.takephoto(self.vshoot.vmodel, flash);
      }
      
    })

    this.socket.on("cancelRequest", function(data){
    	if (self.vshoot.endTime == null){
    		//remove from current vshoots
      		var foundVshoot = false;
      		var wantedVS;
      		vshootId = self.vshoot.id
      		console.log("current length of vs: " + currentvshoots.length);
      		console.log("wantedVS: " + vshootId);

      		for (i=0; i < currentvshoots.length; i++){
        		// console.log("currentvshoots[i].id: " + currentvshoots[i].id)
        		// console.log()
        		if (currentvshoots[i].id == vshootId){
          		wantedVS = i;
          		//foundVshoot = true;
        		}
      		}

      		console.log("wantedVS: " + wantedVS);
          var d = new Date();
          var endTimeStr = d.toUTCString();
          currentvshoots[wantedVS].endTime = endTimeStr
          if (currentvshoots[wantedVS].vmodel != null){
            currentvshoots[wantedVS].vmodel.vshoot.endTime = endTimeStr
          }
          if (currentvshoots[wantedVS].votographer != null){
            currentvshoots[wantedVS].votographer.vshoot.endTime = endTimeStr
          }
      		currentvshoots.splice(wantedVS, 1);
      		console.log(currentvshoots.length)

          //remove event listeners
          this.socket.off('takephoto')
          this.socket.off('cancelRequest')
          console.log("printing socket events after cancelRequest")
          console.log(this.socket.eventNames())
    	}
      
    })

    console.log("printing the events on this socket for " + this.username + "in vshooter constructor");
    var array = this.socket.eventNames()
    console.log("num events on socket is " + array.length)
    console.log(this.socket.eventNames())
    console.log("number of takephoto listeners added")
    console.log(this.socket.listenerCount('takephoto'))
    console.log("number of cancelRequest listeners added")
    console.log(this.socket.listenerCount('cancelRequest'))

    


}

function Vshoot(id) {
    this.id = id;
    this.votographer = null; //Vshooter object
    this.vmodel = null; //Vshooter object
    this.started = false;
    this.duration = null;
    this.startTime = null;
    this.endTime = null;
}

Vshoot.prototype.getID = function() {
    return this.id;
}

Vshoot.prototype.getVotographer = function() {
    return this.votographer;
}

Vshoot.prototype.getVmodel = function() {
    return this.vmodel;
}

Vshoot.prototype.takephoto = function(vmodel, flash) {
    var vshoot = this;
    var socket = vmodel.socket;
    console.log("sending instruction to take photo")
    socket.emit("takephoto", {
      flashSetting: flash
    });
}

Vshoot.prototype.addVshooter = function(vshooter) {
    console.log("adding vshooter");
    if (vshooter.role == "votographer"){
      this.votographer = vshooter;
    }
    else {
      this.vmodel = vshooter;
      console.log("printing vmodel while adding a vshooter")
      console.log(this.vmodel)
    }

    if(this.votographer != null && this.vmodel != null){
      //this means we are ready to start the vshoot
      this.startVshoot();
    }
    
}

Vshoot.prototype.startVshoot = function() {
  console.log("vshoot starting");
  //tell each vshooter that vshoot can now start and also should create a room via RESTAPI
  
  //first get start time
  var d = new Date();
  var startTimeStr = d.toUTCString();
  this.startTime = startTimeStr;

  //then create video room
  var randomNum = Math.floor((Math.random() * 100000) + 1);
  console.log("vmodel: " + this.vmodel.username)
  console.log("votographer: " + this.votographer.username)
  var roomName = this.votographer.username + this.vmodel.username + randomNum;
  var token1 = ''
  var token2 = ''
  console.log(roomName)
	// client.video.rooms
 //            .create({
 //               enableTurn: false,
 //               type: 'peer-to-peer',
 //               uniqueName: roomName
 //             })
 //            .then(room => console.log(room))
 //            .done();
  generateAccessToken(this.votographer.username, roomName, function(t1){
    token1 = t1
  })

  generateAccessToken(this.vmodel.username, roomName, function(t2){
      token2 = t2
    })

  //then send message
      this.votographer.socket.emit("vshootCanStart", {
        vshootId: this.id,
        myRole: "votographer",
        accessToken: token1,
        roomName: roomName
      });
      this.vmodel.socket.emit("vshootCanStart", {
        vshootId: this.id,
        myRole: "vmodel",
        accessToken: token2,
        roomName: roomName
      });
      this.started = true;
}

Vshoot.prototype.endVshoot = function() {
  //remove this vshot from current vshoots array
    this.player1.socket.emit("gameOver")
    this.player2.socket.emit("gameOver")
}


