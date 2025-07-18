const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const path = require("path");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const multerconfig = require("./config/multerconfig");

///////////////////////////

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/login", (req, res) => {
  res.render("login");
});

// profile section
app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  res.render("profile", { user });
});

//upload image
app.get("/profile/upload", (req, res) => {
  res.render("profileupload");
});

app.post(
  "/upload",
  isLoggedIn,
  multerconfig.single("profilepic"),
  async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
  }
);

// All post
app.get("/allpost", isLoggedIn, async (req, res) => {
  const posts = await postModel
    .find()
    .populate("user")
    .populate("likes")
    .sort({ date: -1 }); // show latest first

  res.render("allpost", { posts, currentUser: req.user });
});

// Like
app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect("/profile");
});

//Like all
app.get("/likeAll/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();

  // 🛠 Re-fetch posts to pass them to the EJS
  const posts = await postModel
    .find()
    .populate("user")
    .populate("likes")
    .sort({ date: -1 });

  res.render("allpost", { posts, currentUser: req.user });
  // this makes it work for any page (profile or allpost)
});

// Edit
app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id });
  res.render("edit.ejs", { post });
});
// Update post
app.post("/updatepost/:id", isLoggedIn, async (req, res) => {
  let { newcontent } = req.body;
  let id = req.params.id;
  console.log(id);
  console.log(newcontent);

  let updatedPost = await postModel.findOneAndUpdate(
    { _id: id },
    {
      content: newcontent,
    }
  );
  res.redirect("/profile");
});

// post new post
app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let post = await postModel.create({
    user: user._id,
    content: req.body.content,
  });

  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

// Delete
app.get("/delete/:id", isLoggedIn, async (req, res) => {
  let id = req.params.id;
  const post = await postModel.findById(id);
  await postModel.findByIdAndDelete(id);
  //Remove the post from the user's posts array
  await userModel.findByIdAndUpdate(post.user, {
    $pull: { posts: id },
  });

  res.redirect("/profile");
});

// user registration
app.post("/register", async (req, res) => {
  let { name, username, age, email, password } = req.body;

  let user = await userModel.findOne({ email });
  if (user) {
    return res.status(500).send("User Already registered");
  }

  bcrypt.genSalt(saltRounds, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      let user = await userModel.create({
        name,
        username,
        age,
        email,
        password: hash,
      });

      let token = jwt.sign({ email: email, userid: user._id }, "secretkey");
      res.cookie("token", token);
      res.redirect("/login");
    });
  });
});

//user log in
app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) {
    return res.status(500).send("USomething Wend Wrong");
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "secretkey");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

//user log out
app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  let key = req.cookies.token;
  if (key === "") res.redirect("/login");
  else {
    let data = jwt.verify(key, "secretkey");
    req.user = data;
    next();
  }
}

app.listen(3000);
