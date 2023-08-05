import bcrypt from "bcrypt";
import sequelize from "./database/database.js";
import Users from "./models/users.js";
import initModels from "./models/init-models.js";

let usuario = {
    nombre: "pedro",
    password: "123456",
    email: "pedro@gmail.com",
};
const main = async () => {
    try {
        await sequelize.authenticate();
        initModels(sequelize);
        await sequelize.sync();

        const hash = bcrypt.hashSync(usuario.password, 10);

        console.log(hash);

        /*
        await Users.create({
            email: usuario.email,
            password: hash,
        });
        */

        let usuarioDb = await Users.findOne({
            where: {
                email: usuario.email,
            },
        });

        console.log(usuarioDb);

        //comparar hash
        console.log(usuario.password, usuarioDb.password);
        bcrypt
            .compare(usuario.password, usuarioDb.password)
            .then(function (result) {
                if (result) {
                    console.log("Login correcto.");
                } else {
                    console.log("Error de credenciales");
                }
            });
    } catch (error) {
        console.log(error);
    }
};

main();
