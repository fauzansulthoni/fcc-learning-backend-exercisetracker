const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { dbName: "fcc_exercisetracker" })
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userExerciseSchema = new mongoose.Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }
  ]
})

const UserExercise = mongoose.model('UserExercise', userExerciseSchema);


app.get('/api/users', async function (req, res) {
  try {
    let data = await UserExercise.aggregate([
      {
        $project: {
          _id: 1,
          username: 1,
          __v: 1
        }
      }
    ])
    // data.forEach(m => m.username )
    res.json(data)
  } catch (error) {
    res.json({ error: `Data tidak ditemukan ${error}` })
  }
})

app.post('/api/users', async function (req, res) {
  // console.log("you try to add the user data")
  // res.json({status: req.body.username});
  try {
    let data = await UserExercise({ username: req.body.username })
    data.save()
    res.json({
      username: data.username,
      _id: data._id
    });
  } catch (error) {
    res.json({ error: `Your data cannot be saved: ${error}` })
  }
})

app.post('/api/users/:_id/exercises', async function (req, res) {
  let id = req.params._id;
  let description = req.body.description;
  let duration = Number(req.body.duration);
  let date = new Date(req.body.date);
  let newLog = {
    description: description,
    duration: duration,
    date: date
  }
  try {
    let data = await UserExercise.findByIdAndUpdate(id,
      { $push: { log: newLog } },
      { new: true, useFindAndModify: false }
    )

    // Get the newly added log entry (last item in the array)
    const addedLog = data.log[data.log.length - 1];

    // Format the date
    const formattedDate = new Date(addedLog.date).toDateString();

    // Build the response
    res.json({
      username: data.username,
      description: addedLog.description,
      duration: addedLog.duration,
      date: formattedDate,
      _id: addedLog._id
    });
  } catch (error) {
    res.json({ error: `Your data cannot be updated: ${error}` })
  }
})
app.get('/api/users/:_id/logs', async function (req, res) {
  let id = req.params._id;
  let from = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = parseInt(req.query.limit) || 10;
  try {
    let data = await UserExercise.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId("68a3d3558d53e26c6793d7c2") }
      },
      {
        $project: {
          username: 1,
          from: 1,
          to: 1,
          count: {
            $size: {
              $filter: {
                input: "$log",
                as: "entry",
                cond: {
                  $and: [
                    { $gte: ["$$entry.date", from] },
                    { $lte: ["$$entry.date", to] }
                  ]
                }
              }
            }
          },
          log: {
            $map: {
              input: {
                $slice: [
                  {
                    $filter: {
                      input: "$log",
                      as: "entry",
                      cond: {
                        $and: [
                          { $gte: ["$$entry.date", from] },
                          { $lte: ["$$entry.date", to] }
                        ]
                      }
                    },
                  },
                  limit
                ]
              },
              as: "entry",
              in: {
                description: "$$entry.description",
                duration: "$$entry.duration",
                date: {
                        $dateToString: {
                          format: "%Y-%m-%d", // e.g., "Sat Aug 16 2025"
                          date: "$$entry.date",
                          timezone: "Asia/Jakarta" // optional, for local time
                        }
                      }
                // intentionally omitting $$entry._id
              }
            }
          }
        }
      }

    ]);

    let formatData = {
      _id: id,
      username: data[0].username,
      from: new Date(from).toDateString(),
      to: new Date(to).toDateString(),
      count: data[0].count,
      log: data[0].log
    }
    res.json(formatData)
  } catch (error) {
    res.json({ error: `Your cannot logged the data: ${error}` })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
