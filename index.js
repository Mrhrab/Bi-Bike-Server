const express = require('express');
const app = express();
require('dotenv').config();
const { MongoClient } = require('mongodb');
const cors = require('cors');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;

const port =process.env.PORT || 5000;




const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wuozl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken (req, res, next) {
     if(req.headers?.authorization.startsWith('Bearer ')){
       const token = req.headers.authorization.split(' ')[1];

       try{
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedEmail = decodedUser.email;
       }
       catch{

       }
     }
     next();
}


async function run(){
    try{
        await client.connect();
        const database = client.db('bi-bike_db');
        const productCollection = database.collection('products');
        const ordersCollection = database.collection('orders');
        const reviewsCollection = database.collection('review');
        const usersCollection = database.collection('users');

        // user data post, out, get 
        app.post('/users', async (req, res)=>{
           const user = req.body;
           const result = await usersCollection.insertOne(user); 
           console.log(user);
           res.json(result)
        });
        app.get('/users/:email', async(req, res) => {
          const email = req.params.email;
          const query = {email: email};
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if(user?.role === 'admin'){
            isAdmin = true;
          }
          res.json({admin: isAdmin});
        });
        app.put('/users/admin', verifyToken, async (req, res)=> {
          const user = req.body;
          const requester =  req.decodedEmail;
          if(requester){
            const requesterAccount =await usersCollection.findOne({email: requester});
            if(requesterAccount.role === 'admin'){
               const filter = {email: user.email};
          const updateDoc = {$set: {role: 'admin'}};
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
            }
          }
          else{
            res.status(401).json({message: ' you do not have access to make admin  '});
          }

         
          
        })



        // review post and get
        app.post('/reviews', async (req, res)=>{
           const review = req.body;
           const result = await reviewsCollection.insertOne(review); 
           console.log(review);
           res.json(result)
        });
        app.get('/reviews', async(req, res) => {
          const cursor  = reviewsCollection.find({});
          const products = await cursor.toArray();
          res.send(products);
        });




        // products Post and Get
        app.get('/products', async(req, res) => {
          const cursor  = productCollection.find({});
          const products = await cursor.toArray();
          res.send(products);
        });
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            console.log('getting specific service', id);
            const query = { _id: ObjectId(id) };
            const service = await productCollection.findOne(query);
            res.json(service);
        })
          
        app.post('/products', async (req, res)=>{
           const product = req.body;
           const result = await productCollection.insertOne(product); 
           console.log(product);
           res.json(result)
        });



         
       //  order post, get, delete
        app.post('/orders', async (req, res)=>{
           const order = req.body;
           const result = await ordersCollection.insertOne(order); 
           console.log(order);
           res.json(result)
        });
        app.get('/orders', async (req, res)=>{
          const email = req.query.email;
          const query = {email: email};
          const cursor = ordersCollection.find(query);
          const order = await cursor.toArray();
          res.json(order);
        })
        app.delete('/orders/:id', async (req, res) => {
          const id = req.params.id;
          const query = {_id:ObjectId(id)};
          const result = await ordersCollection.deleteOne(query);
          res.json(result);
        })
            
        

    }
    finally{
        // await client.close();
    }

}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello Bi-Bike Portal!')
})

app.listen(port, () => {
  console.log(` Listening at ${port}`)
})