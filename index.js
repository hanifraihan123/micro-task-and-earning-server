const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middlewares
app.use(express.json())
app.use(cors({
  origin: ['http://localhost:5173','https://paidwork-task-and-earning.web.app'], credentials: true
}))
app.use(cookieParser())

const verifyToken = (req,res,next) => {
  const token = req.cookies?.token;
  if(!token){
   return res.status(401).send({message: 'Unauthorized Access'})
  }
jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
  if(err){
   return res.status(401).send({message: 'Unauthorized Access'})
  }
  req.user = decoded;
  next()
})
}

const verifyAdmin = async(req,res,next) => {
  const email = req.decoded.email;
  const query = {email: email};
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if(!isAdmin){
    return res.status(403).send({message: 'Forbidden Access'})
  }
  next();
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.neb49.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const userCollection = client.db('micro-task').collection('users')
    const taskCollection = client.db('micro-task').collection('tasks')
    const submissionCollection = client.db('micro-task').collection('submissions')
    const withdrawCollection = client.db('micro-task').collection('withdraws')
    const paymentCollection = client.db('micro-task').collection('payments')

    // jwt token related APIs
    app.post('/jwt', (req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.JWT_SECRET,{expiresIn: '5h'})
      // res.cookie('token',token,{ httpOnly: true }).send({success: true})
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    
    app.post('/logout', (req,res)=>{
      res.clearCookie('token', { httpOnly: true }).send({success: true})
    })

    // Task related APIs
    app.post('/tasks',verifyToken, async(req,res)=>{
      const tasks = req.body;
      const result = await taskCollection.insertOne(tasks)
      res.send(result)
    })

    app.get('/tasks',verifyToken, async(req,res)=>{
      const result = await taskCollection.find().toArray();
      res.send(result)
    })

    app.get('/task/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await taskCollection.findOne(query);
      res.send(result)
    })

    app.get('/tasks/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const result = await taskCollection.find(query).toArray()
      res.send(result);
    })

    app.delete('/task/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await taskCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/task/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const tasks = req.body;
      const query = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          title: tasks.title,
          details: tasks.details,
          info: tasks.info
        }
      }
      const result = await taskCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

    app.patch('/updateWorker/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const newWorker = req.body;
      const updatedDoc = {
        $inc: {
          workers: newWorker.worker
        }
      }
      const result = await taskCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

    // task form submission related APIs
    app.post('/submission',verifyToken, async(req,res)=>{
      const submit = req.body;
      const result = await submissionCollection.insertOne(submit);
      res.send(result)
    })

    app.get('/submissions/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {workerEmail: email};
      const result = await submissionCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/submits/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {buyerEmail: email};
      const result = await submissionCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/submit/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await submissionCollection.findOne(query)
      res.send(result)
    })

    app.patch('/submit/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const subDetails = req.body;
      const query = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          status: subDetails.status
        }
      }
      const result = await submissionCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

    // Withdraw related APIs
    app.post('/withdraws',verifyToken, async(req,res)=>{
      const withdraws = req.body;
      const result = await withdrawCollection.insertOne(withdraws);
      res.send(result)
    })

    app.get('/withdraws',verifyToken, async(req,res)=>{
      const result = await withdrawCollection.find().toArray();
      res.send((result))
    })

    app.get('/withdraw/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await withdrawCollection.findOne(query)
      res.send(result)
    })

    app.patch('/withdraw/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const statusRes = req.body;
      const query = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          status: statusRes.status
        }
      }
      const result = await withdrawCollection.updateOne(query,updatedDoc)
      res.send(result)
    })
    
    // users related APIs
    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}
      const alreadyExist = await userCollection.findOne(query)
      if(alreadyExist){return res.status(400).send('Already Exist')}
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    app.patch('/user/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = { email };
      const newCoin = req.body;
      const updatedDoc = {
        $inc: {
          coin: -newCoin.coin
        }
      }
      const result = await userCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

    app.patch('/usersCoin/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const updateCoin = req.body;
      const updatedDoc = {
        $set: {
          coin: updateCoin.coin
        }
      }
      const result = await userCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

    app.patch('/increaseCoin/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const updateCoin = req.body;
      const updatedDoc = {
        $inc: {
          coin: updateCoin.amount
        }
      }
      const result = await userCollection.updateOne(query,updatedDoc);
      res.send(result)
    })

    app.get('/users',verifyToken, async(req,res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/someUsers', async(req,res)=>{
      const query = {role: 'worker'}
      const options = {
        sort: {coin: -1}
      }
      const result = await userCollection.find(query,options).toArray();
      res.send(result)
    })

    app.patch('/updateCoin/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const newCoin = req.body;
      const updatedDoc = {
        $inc: {
          coin: newCoin.coin
        }
      }
      const result = await userCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

    app.get('/countData',verifyToken, async(req,res)=>{
      const buyerCount = await userCollection.countDocuments({ role: 'buyer' });
      const workerCount = await userCollection.countDocuments({ role: 'worker' });
      const result = {buyer: buyerCount, worker: workerCount};
      res.send(result)
    })

    app.get('/user/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const result = await userCollection.findOne(query);
      res.send(result)
    })

    app.delete('/user/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/user/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const updatedRole = req.body;
      const query = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: updatedRole.role
        }
      }
      const result = await userCollection.updateOne(query,updatedDoc);
      res.send(result)
    })

    //Payment related APIs
    app.post('/create-payment-intent',verifyToken, async(req,res)=>{
      const {price} = req.body;
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    }) 

    app.post('/payment',verifyToken, async(req,res)=>{
      const paymentInfo = req.body;
      const result = await paymentCollection.insertOne(paymentInfo);
      res.send(result)
    })

    app.get('/payments',verifyToken, async(req,res)=>{
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })

    app.get('/payments/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {email};
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    })

    app.patch('/changeCoin/:id',verifyToken, async(req,res)=>{
      const id = req.params.id;
      const coins = req.body;
      const query = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          coin: coins.newCoin
        }
      }
      const result = await userCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('micro task server is running')
})

app.listen(port, ()=>{
    console.log(`server is running on port ${port}`)
})