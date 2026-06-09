import app from "./app.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`K2 Performance backend działa na porcie ${PORT}`);
});