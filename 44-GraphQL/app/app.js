const express = require('express')
const { Server: HttpServer } = require('http')
const { Server: IOServer } = require('socket.io')
const { graphqlHTTP } = require('express-graphql')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const passport = require('passport')
const process = require('process')
const handlebars = require('express-handlebars')
const bodyParser = require('body-parser')
const path = require('path')
const compression = require('compression');
const dotenv = require('dotenv')

const { getAllProducts, getProductById, createNewProduct, 
updateProduct, deleteProduct} = require('../controllers/gqlController.js')

const gqlSchemas = require('../db/schemas/gqlSchemas')

const homeRouter = require('../routes/home.js').router
const accountsRouter = require('../routes/accounts.js').router
const carritosRouter = require('../routes/carrito.js').router
const comprasRouter = require('../routes/compras.js').router
const productosRouter = require('../routes/productos.js').router
const logger = require('../controllers/logControl').logger


dotenv.config()

const app = express()
const httpServer = new HttpServer(app)
const io = new IOServer(httpServer)
app.use(compression());

app.use(cookieParser())
let mongoCreds = {
    mongoUrl: process.env.mongoUrl,
    autoRemove: 'native',
    ttl: 600,
    mongoOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
}

app.use(session({
    store: MongoStore.create(mongoCreds),
    secret: 'tarara',
    resave: true,
    saveUninitialized: false}))

app.use(session({
    secret: 'tarara',
    cookie: {
        httpOnly: false,
        secure: false,
        maxAge: 600
    },
    rolling: true,
    resave: true,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

app.engine("hbs",
 handlebars.engine({
    extname: ".hbs",
    partialsDir: path.join(__dirname, '..', '/views/partials')
}))

app.set("view engine", "hbs")

app.set("views", path.join(__dirname, '..',"/views"))

/* Necesito esto para poder usar sockers en mi Router */
app.set('socketio', io)

//Log time and request
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`)
    next()
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(express.static(path.join(__dirname,'..', 'scripts')))
app.use('/imgs',express.static(path.join(__dirname,'..', 'public', 'uploads')))

app.use(homeRouter)
app.use('/accounts', accountsRouter)
app.use('/productos', productosRouter)
app.use('/carritos', carritosRouter)
app.use('/compras', comprasRouter)
app.use('/gql', graphqlHTTP({
    schema: gqlSchemas,
    rootValue: {
        getAllProducts,
        getProductById,
        createNewProduct,
        updateProduct,
        deleteProduct
    },
    graphiql: true
}))

// Handleo todo lo no implementado aca
app.all("*", (req, res) => {    
    res.status(404)
    res.redirect('/error')
    logger.warn(`Acceso a ruta inexistente ${req.originalUrl}`)
});

exports.app = app
exports.httpServer = httpServer