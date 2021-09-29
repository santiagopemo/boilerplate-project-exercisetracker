const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(mongoose.connection.readyState);

const {Schema} = mongoose;

const userSchema = new Schema({
  username: {type: String, required: true, unique: true}
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date},
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

const simpleLogger = (req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
}
app.use(simpleLogger);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.post('/api/users', (req, res) => {
  // console.log(req.body.username);
  User.create({username: req.body.username}, (err, data) => {
    if (err) {
      res.send(err.message);
    } else {
      res.json({
        username: data.username,
        _id: data._id
      });
    }
  });
});

app.get('/api/users', (req, res) => {
  User.find((err, data) => {
    res.send(data);
  });
})

app.post('/api/users/:_id/exercises', (req, res) => {
  // console.log(req.params._id);
  // console.log(req.body);
  const userId = req.params._id
  const {description, duration, date} = req.body
  const newExercise = new Exercise({
    userId,
    description,
    duration,
    date
  });
  User.findById(userId, (err, data) => {
    if (err) {
      res.send(err.message);
    } else {
      if (data) {
        const { username } = data
        newExercise.save((err, data) => {
          if (err) {
            res.send(err.message);
          } else {
            const { _id, description, duration, date } = data
            res.json({_id: userId, username, description, duration, date: new Date(date).toDateString()})
          }
        });      
      } else {
        res.send('Unknown userId');
      }
      
    }
  })

});

app.get('/api/users/:_id/logs', (req, res) => {
  // console.log(req.params._id);
  // console.log(req.body);
  const userId = req.params._id;
  let { from, to, limit } = req.query;
  limit = parseInt(limit) || 0;
  User.findById(userId, (err, user) => {
    if (err) {
      res.send(err.message);
    } else if (user) {
      
      let searchConfig;
      if (from && to) {
        searchConfig = {userId, date: {$gte: new Date(from), $lte: new Date(to)}};
      } else if (from && !to) {
        searchConfig = {userId, date: {$gte: new Date(from)}};
      } else if (!from && to) {
        searchConfig = {userId, date: {$lte: new Date(to)}};
      } else {
        searchConfig = {userId};
      }
      Exercise.find(searchConfig, {_id: 0, userId: 0, __v: 0})
      .limit(limit)
      .exec((err, exercises) => {
        if (err) {
          res.send(err)
        } else {
          const customExercises = exercises.map((exercise) => {            
            let customDate = exercise.date ? new Date(exercise.date) : new Date()
            return {description: exercise.description, duration: exercise.duration, date: customDate.toDateString()};
          });
          const { _id, username } = user; 
          res.json({
            _id,
            username,
            count: customExercises.length,
            log: customExercises
          });
        }        
      });
    } else {
      res.send('Unknown userId');
    }
  });
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
