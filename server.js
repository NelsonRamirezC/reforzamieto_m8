import express from "express";
import cors from "cors";
import { create } from "express-handlebars"; // "express-handlebars"
import upload from "express-fileupload";
import jwt from "jsonwebtoken";

import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

//modelos
import Users from "./models/users.js";

//Operadores sequelizr
import { Op } from "sequelize";
import Stores from "./models/stores.js";
import Categories from "./models/categories.js";
import Brands from "./models/brands.js";
import Products from "./models/products.js";
import Stocks from "./models/stocks.js";
const app = express();


//middlewares generales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(upload());

//configuración handlebars

const hbs = create({
    partialsDir: [path.resolve(__dirname, "./views/partials/")],
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));

//vistas
app.get(["/", "/home"], (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

const verifyToken = (req, res, next) => {
    let token = req.query.token;
    if (!token) {
        try {
            let authorization = req.headers.authorization;
            if (!authorization) {
                return res
                    .status(401)
                    .json({
                        code: 401,
                        message:
                            "No tiene permisos de acceso, debe proporcionar un token",
                    });
            }
            token = authorization.split(" ")[1];
        } catch (error) {
            console.log(error);
            return res
                .status(500)
                .json({
                    code: 500,
                    message: "Error en proceso de verificación del token.",
                });
        }
    }

    jwt.verify(token, "miPassword", function (error, decoded) {
        if (error) {
            return res.status(401).json({
                code: 401,
                message: "Token invalido o expirado.",
            });
        }
        //se imprime información del token
        console.log(decoded);
        next();
    });
};

app.get("/monitor", verifyToken, async (req, res) => {
    let { tienda, categoria, marca } = req.query;
    let filtroTienda = {};

    if (tienda) {
        filtroTienda.store_id = tienda;
    }

    let filtroProductos = {};
    if (categoria) {
        filtroProductos.category_id = categoria;
    }
    if (marca) {
        filtroProductos.brand_id = marca;
    }
    
    //tiendas
    let tiendas = await Stores.findAll({
        attributes: ["store_id", "store_name"],
    });
    tiendas = tiendas.map((tienda) => tienda.toJSON());

    //categorias
    let categorias = await Categories.findAll({
        attributes: ["category_id", "category_name"],
    });
    categorias = categorias.map((categoria) => categoria.toJSON());

    //marcas
    let marcas = await Brands.findAll({
        attributes: ["brand_id", "brand_name"],
    });
    marcas = marcas.map((marca) => marca.toJSON());
    

    let { count, rows } = await Stores.findAndCountAll({
        raw: true,
        attributes: ["store_id", "store_name"],
        include: [
            {
                model: Products,
                as: "productos",
                where: filtroProductos,
            },
        ],

        where: filtroTienda,
    });

    let inventario = rows.map(producto => {
        let objProducto = {
            nombreTienda: producto.store_name,
            idProducto: producto["productos.product_id"],
            nombreProducto: producto["productos.product_name"],
            cantidadInventario: producto["productos.Stocks.quantity"],
        };

        return objProducto
    })
    console.log(inventario);

    res.render("monitor", {
        marcas,
        categorias,
        tiendas,
        inventario,
        cantidadRegistros: count
    });
});

//endpoints

const emitToken = async (req, res, next) => {
    let { email, password } = req.body;
    try {
        if (!email || !password) {
            return res
                .status(400)
                .json({
                    code: 400,
                    message: "Debe proporcionar credenciales de acceso.",
                });
        }

        let usuario = await Users.findOne({
            where: {
                [Op.and]: [{ email }, { password }],
            },
            attributes: ["email"],
        });

        if (!usuario) {
            return res.status(404).json({
                code: 404,
                message: "Usuario no existe o credenciales son invalidas.",
            });
        }

        //EMITIR TOKEN PARA EL USUARIO
        let token = jwt.sign(
            {
                data: usuario,
            },
            "miPassword",
            { expiresIn: "1h" }
        );

        req.token = token;
        next();
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: "Error en proceso de generación de token.",
        });
    }
};

app.post("/api/login", emitToken, async (req, res) => {
    try {
        res.json({ code: 200, message: "Login correcto", token: req.token });
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: "Error al procesar solicitud de login.",
        });
    }
});

//RUTA DESCONOCIDA
app.all("*", (req, res) => {
    res.status(404).send("Ruta desconocida.");
});

export default app;
