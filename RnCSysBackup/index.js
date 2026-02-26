import express from "express";
import path from "path";
import session from "express-session";
import router from "./routes/index.js";
import ejs from "ejs";

const app = express();
const PORT = process.env.PORT || 3172;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  secret: "xianfire-secret-key",
  resave: false,
  saveUninitialized: false
}));

app.set("views", path.join(process.cwd(), "views"));

app.engine("xian", ejs.renderFile);
app.set("view engine", "xian");

app.use("/", router);

app.listen(PORT, () => console.log(`🔥 XianFire running at http://localhost:${PORT}`));
