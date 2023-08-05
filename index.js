import sequelize from "./database/database.js";
import app from "./server.js";
import initModels from "./models/init-models.js";

(async () => {
    console.log("Iniciando aplicación...");
    await sequelize.authenticate();
    initModels(sequelize);
    await sequelize.sync({force: false, alter: true});
    app.listen(3000);
    console.log("Servidor escuchando en puerto 3000");
})();
