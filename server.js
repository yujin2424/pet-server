const express=require("express");
const cors=require("cors");
const app=express();
const models = require('./models');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const secretKey = crypto.randomBytes(32).toString('hex');

const upload = multer({
   storage: multer.diskStorage({
      destination: function (req, file, cb) {
         cb(null, "uploads/");
      },
      filename: function (req, file, cb) {
         cb(null, file.originalname);
      },
   }),
});

const port="8080";

app.use(express.json());
app.use(cors({
   origin: ['http://localhost:3000', 'https://p-app-nine.vercel.app'], // 허용하는 출처 목록
   credentials: true, // 인증 정보 전송 허용
  })); // 브라우저의 cors 이슈를 막기 위해 사용하는 코드.
app.use('/uploads', express.static('uploads'));

app.get("/products", (req, res) => {
   models.Product.findAll({
      order: [["createdAt", "DESC"]],
      attributes: ["id", "name", "price", "seller", "imageUrl", "createdAt"],
   })
      .then((result) => {
         console.log("PRODUCTS : ", result);
         res.send({
         products: result,
         });
      })
      .catch((error) => {
         console.error(error);
         res.send("에러 발생");
      });
});

app.get('/products/:id', (req, res) => {
   const params = req.params;
   const{id} = params;
   models.Product.findOne({
      where: {
         id: id,
      }
   }).then((result) => {
      console.log('PRODUCT: ', result);
      res.send({
         product: result
      })
   }).catch((error) => {
      console.error(error);
      res.status(400).send('상품 조회 시 에러가 발생했습니다.');
   });

})
app.post('/products', (req, res) =>{
   const body = req.body;
   const {name, description, price, seller, imageUrl} = body;

   if(!name | !description | !price | !seller) {
      res.send('모든 필드를 입력해주세요.')
   };

   models.Product.create({
      name,
      description,
      price,
      seller,
      imageUrl
   }).then((result) => {
      res.send({product: result});
   }).catch((error) => {
      console.log(error);
      res.status(400).send('상품 업로드에 문제가 발생했습니다.');
   });
});

app.post('/products/:id', (req, res) =>{
   const params = req.params;
   const {id} = params;
   models.Product.findOne({
   where: {id: id}
   }).then((result) => {
      console.log('product', result);
      res.send({product: result});
   }).catch((error) => {
      console.error();
      res.status(400).send('에러발생');
   })
});

app.post('/image', upload.single('image'), (req, res) => {
   const file = req.file;
   res.send({
      imageUrl: file.path
   });
});

//회원가입
app.post("/users", (req, res) =>{
   const body=req.body;
   const {user_id, pw, name, phone, email, birth,marketingChecked} = body;
   if(!user_id|| !pw|| !name|| !phone|| !email|| !birth||!marketingChecked){
      res.send('모든 필드를 입력해주세요')
   }
   models.User.create({
      user_id,
      pw,
      name,
      phone,
      email,
      birth,
      marketingChecked
   })
   .then((result)=>{
      console.log('회원가입성공:', result);
      res.send({result,})
   })
   .catch((error)=>{
      console.error(error);
      res.status(400).send('회원가입실패')
   })
   
});

app.post('/users/login', (req, res) =>{
   const body=req.body;
   const {user_id, pw}=body;
   models.User.findOne({
      where:{
         user_id:user_id,
      }
   })
   .then((result)=>{
      console.log("result.id :" + result.user_id + "user_id:" + user_id + "result.pw:"+ result.pw+ "pw:" +pw);
      console.log("result :" ,result)
      if(result.user_id == user_id && result.pw == pw){
         console.log('로그인 정보 성공');
         const user = {
            id: user_id,
            username: user_id
         }
         const accessToken = jwt.sign(user, secretKey, {expiresIn: '1h'})
         res.send({
            user: result.user_id,
            accessToken: accessToken
         })
      }else{
         console.log("로그인 실패");
         res.send({
            user: 'False'
         })
      }
   })
   .catch((error)=>{
      console.error(error);
      res.send('유저 정보 에러 발생' + error)
   })   
});

app.post('/auth', (req, res) => {
   const body = req.body;
   const {accessToken} = body;

   if(!accessToken) {
      res.send(false);
   } else {
      try{
         const decoded = jwt.verify(accessToken, secretKey);
         if(decoded && decoded.exp > Math.floor(Date.now()/1000)){
            res.send({result: decoded});
         } else {
            res.send({result: "검증 실패"});
         };
      } catch(error){
         res.send({result: error});
      };
   };
});
 
// 중복 아이디 확인
app.get("/users/:id",(req,res)=>{
   const params = req.params;
   const {id} = params;
   models.User.findOne({
      where:{
      user_id:id,
      }
   })
   .then((result)=>{
      console.log('user_result:',result);
      res.send({
      user:result
      })

   }).catch((err)=>{
      console.error(err);
      res.send({user:'ERR_IN_USERS_ID', error: err});

   })
});

/* const server=http.createServer((req, res) => {
   const path = req.url;
   const method = req.method;
   
   if(path === "/products") {
      if(method === "GET") {
         res.writeHead(200, {"Content-type": "application/json"});
         const products = JSON.stringify([
            {
               name: "강아지간식",
               price: 5000
            }
         ]);
         res.end(products);
      } else if(method === "POST") {
         res.end('생성되었습니다.');
      }
   }
   res.end('Good Bye');
}); */

app.listen(port, ()=>{
   console.log('쇼핑몰 서버가 돌아가고 있어요')
   models.sequelize   
      .sync()
      .then(() => {
         console.log('✓ DB 연결 성공');
      })
      .catch(function (err) {
         console.error(err);
         console.log('✗ DB 연결 에러');
            //에러발생시 서버프로세스 종료
         process.exit();
   });
});