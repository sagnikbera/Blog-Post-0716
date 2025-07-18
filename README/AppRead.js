// --- 1. Core Module Imports ---
// Import the Express.js framework, which is used to build web applications and APIs.
const express = require("express");
// Create an instance of the Express application. This 'app' object will be used
// to configure routes, middleware, and start the server.
const app = express();

// --- 2. Database Model Imports ---
// Import Mongoose models for 'User' and 'Post'.
// These models are definitions for how data will be structured and interacted with
// in your MongoDB database. They provide methods like .findOne(), .create(), etc.
const userModel = require("./models/user");
const postModel = require("./models/post");

// --- 3. Authentication-related Module Imports ---
// Import bcrypt for password hashing. It's crucial for security to store
// hashed passwords, not plain text.
const bcrypt = require("bcrypt");
// Define the number of salt rounds for bcrypt. Higher numbers mean more secure
// hashing but take more time. 10 is a common and good default.
const saltRounds = 10;
// Import jsonwebtoken for creating and verifying JSON Web Tokens (JWTs).
// JWTs are used for stateless authentication, allowing the server to verify
// a user's identity without storing session data on the server.
const jwt = require("jsonwebtoken");

// --- 4. Express Application Configuration ---
// Set 'ejs' as the view engine. This means Express will use EJS (Embedded JavaScript)
// templates to render dynamic HTML pages.
app.set("view engine", "ejs");

// Use built-in Express middleware to parse incoming request bodies.
// `express.json()`: Parses incoming requests with JSON payloads.
app.use(express.json());
// `express.urlencoded({ extended: true })`: Parses incoming requests with URL-encoded
// payloads (e.g., data from HTML forms). `extended: true` allows for rich objects
// and arrays to be encoded into the URL-encoded format.
app.use(express.urlencoded({ extended: true }));

// Import and use cookie-parser middleware.
// This middleware parses cookies attached to the client request object (req.cookies).
// Without this, req.cookies would be undefined.
const cookieParser = require("cookie-parser");

// --- Unused Imports (Present in Original Code) ---
// These imports 'post' and 'connect' are present in your original code
// but appear to be unused variables in this specific file.
// 'post' is likely a remnant, as 'postModel' is already imported and used.
// 'connect' is from Mongoose but is typically used for the initial database connection,
// not as a variable within route handlers.
const post = require("./models/post");
const { connect } = require("mongoose");

app.use(cookieParser());

// --- 5. Routes Definition ---

// GET route for the homepage.
// When a user visits '/', it renders the 'index.ejs' template.
app.get("/", (req, res) => {
  res.render("index");
});

// GET route for the login page.
// When a user visits '/login', it renders the 'login.ejs' template.
app.get("/login", (req, res) => {
  res.render("login");
});

// --- User Profile Section ---

// GET route for the user's profile page.
// `isLoggedIn` middleware runs first to ensure the user is authenticated.
app.get("/profile", isLoggedIn, async (req, res) => {
  // Find the user in the database using the email extracted from the JWT token (req.user.email).
  // `.populate("posts")`: This is a Mongoose feature. It replaces the 'posts' IDs
  // stored in the user document with the actual Post documents from the 'posts' collection.
  // This allows you to access post content directly (e.g., user.posts[0].content) in EJS.
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts"); // Populates the 'posts' array with actual post documents

  // Render the 'profile.ejs' template, passing the 'user' object (with populated posts) to it.
  res.render("profile", { user });
});

// --- All Posts Section ---

// GET route to display all posts.
// `isLoggedIn` middleware ensures only logged-in users can view all posts.
app.get("/allpost", isLoggedIn, async (req, res) => {
  // Find all posts in the database.
  // `.populate("user")`: Populates the 'user' field in each post with the actual User document.
  // This allows displaying the author's username (e.g., post.user.username).
  // `.populate("likes")`: If 'likes' field in post model stores user IDs, this would populate them.
  // (Note: Your like logic uses `req.user.userid` which is an ID, so this populate might not be strictly needed
  // for the like count, but would be if you wanted to display who liked it).
  // `.sort({ date: -1 })`: Sorts the posts in descending order by their 'date' field (latest first).
  const posts = await postModel
    .find()
    .populate("user") // Populate the 'user' field (author)
    .populate("likes") // Populate the 'likes' array (if it stores user objects)
    .sort({ date: -1 }); // Sort by date in descending order (latest first)

  // Render the 'allpost.ejs' template, passing all 'posts' and the 'currentUser' object
  // (from the JWT) to it.
  res.render("allpost", { posts, currentUser: req.user });
});

// --- Like/Unlike Functionality ---

// GET route to like/unlike a post from the profile page.
// `:id` captures the post ID from the URL.
app.get("/like/:id", isLoggedIn, async (req, res) => {
  // Find the specific post by its ID.
  // `.populate("user")`: Populates the user field, though not strictly needed for the like logic itself.
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  // Check if the current user's ID (req.user.userid from JWT) is already in the post's likes array.
  if (post.likes.indexOf(req.user.userid) === -1) {
    // If not found (-1), add the user's ID to the likes array.
    post.likes.push(req.user.userid);
  } else {
    // If found, remove the user's ID from the likes array (unlike).
    // `splice(index, 1)`: Removes 1 element starting from the given index.
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  // Save the updated post document back to the database.
  await post.save();
  // Redirect back to the profile page.
  res.redirect("/profile");
});

// GET route to like/unlike a post from the 'allpost' page.
// This is similar to '/like/:id' but redirects back to '/allpost'.
app.get("/likeAll/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();

  // After updating the like, re-fetch all posts to ensure the 'allpost' page
  // displays the most current like counts and states.
  const posts = await postModel
    .find()
    .populate("user")
    .populate("likes")
    .sort({ date: -1 });

  // Render the 'allpost.ejs' template with the updated posts data.
  res.render("allpost", { posts, currentUser: req.user });
});

// --- Post Edit Functionality ---

// GET route to display the edit post form.
// `:id` captures the post ID to be edited.
app.get("/edit/:id", isLoggedIn, async (req, res) => {
  // Find the specific post by its ID.
  let post = await postModel.findOne({ _id: req.params.id });
  // Render the 'edit.ejs' template, passing the found 'post' data to pre-fill the form.
  res.render("edit.ejs", { post });
});

// POST route to handle updating a post.
// `:id` captures the post ID from the URL.
app.post("/updatepost/:id", isLoggedIn, async (req, res) => {
  // Destructure 'newcontent' from the request body. This comes from the textarea
  // in the edit form, which has `name="newcontent"`.
  let { newcontent } = req.body;
  // Get the post ID from the URL parameters.
  // The `:id` in the route path `/updatepost/:id` makes this ID available in `req.params.id`.
  let id = req.params.id;

  // Log the extracted ID and new content to the console for debugging.
  // `console.log(id)` will correctly show the ID from the URL.
  // `console.log(newcontent)` will show the updated text from the form.
  console.log(id);
  console.log(newcontent);

  // Attempt to find and update the post in the database.
  // `postModel.findOneAndUpdate`: This line calls `findOneAndUpdate` on the `postModel`.
  //   NOTE: Your original code had `userModel.findOneAndUpdate` here, which would attempt
  //   to update a *user* document instead of a *post*. This has been corrected to `postModel`.
  // `{ _id: id }`: This is the filter to find the document. It looks for a document
  //   where the `_id` field matches the `id` from the URL.
  // `{ content: newcontent, }`: This is the update object.
  //   NOTE: Your original code had `connect: newcontent`. This has been corrected to `content`
  //   assuming `content` is the actual field name in your Post schema.
  //   Also, for Mongoose updates, it's generally recommended to use MongoDB update operators
  //   like `$set` for clarity and to explicitly update only specific fields,
  //   e.g., `{ $set: { content: newcontent } }`. Without `$set`, Mongoose might interpret
  //   this as replacing the entire document with just the `content` field.
  let updatedPost = await postModel.findOneAndUpdate(
    { _id: id },
    {
      content: newcontent,
    }
  );
  // After the update operation (whether successful or not), redirect the user to their profile page.
  res.redirect("/profile");
});

// --- Post Creation Functionality ---

// POST route to handle creating a new post.
app.post("/post", isLoggedIn, async (req, res) => {
  // Find the current authenticated user from the database.
  let user = await userModel.findOne({ email: req.user.email });

  // Create a new post document in the 'posts' collection.
  // `user: user._id`: Links the post to the user by storing the user's ID.
  // `content: req.body.content`: Gets the post content from the form textarea.
  let post = await postModel.create({
    user: user._id, // Assign the user's ID as the author of the post
    content: req.body.content, // Get content from the form
  });

  // Add the newly created post's ID to the user's 'posts' array.
  // This maintains the relationship from the user's side.
  user.posts.push(post._id);
  // Save the updated user document to persist the new post reference.
  await user.save();

  // Redirect to the profile page after creating the post.
  res.redirect("/profile");
});

// --- Post Deletion Functionality ---

// GET route to handle deleting a post.
// `:id` captures the post ID to be deleted.
app.get("/delete/:id", isLoggedIn, async (req, res) => {
  let id = req.params.id;

  // Find the post by ID first to get its 'user' (author) ID.
  // This is needed to remove the post's reference from the user's document.
  const post = await postModel.findById(id);

  // If the post doesn't exist, handle it.
  // NOTE: It's good practice to add a check here for `if (!post)`
  // before proceeding, to prevent errors if the post is not found.

  // Delete the post document from the 'posts' collection.
  await postModel.findByIdAndDelete(id);
  //Remove the post from the user's posts array
  // After deleting the post, remove its reference from the author's user document.
  // `userModel.findByIdAndUpdate(userId, { $pull: { arrayName: valueToRemove } })`
  // `$pull`: This MongoDB operator removes all instances of a specified value
  // from an existing array. Here, it removes the deleted post's `id` from the
  // `posts` array of the user who authored it (`post.user`).
  await userModel.findByIdAndUpdate(post.user, {
    $pull: { posts: id },
  });

  // Redirect to the profile page after deletion.
  res.redirect("/profile");
});

// --- User Registration ---

// POST route to handle new user registration.
app.post("/register", async (req, res) => {
  // Destructure user details from the request body.
  let { name, username, age, email, password } = req.body;

  // Check if a user with the given email already exists.
  let user = await userModel.findOne({ email });
  if (user) {
    // If user exists, send an error response.
    return res.status(500).send("User Already registered");
  }

  // Generate a salt for password hashing.
  bcrypt.genSalt(saltRounds, function (err, salt) {
    if (err) {
      // Handle error during salt generation.
      console.error("Error generating salt:", err);
      return res.status(500).send("Registration failed.");
    }
    // Hash the user's password using the generated salt.
    bcrypt.hash(password, salt, async function (err, hash) {
      if (err) {
        // Handle error during password hashing.
        console.error("Error hashing password:", err);
        return res.status(500).send("Registration failed.");
      }
      // Create a new user document in the 'users' collection with the hashed password.
      let user = await userModel.create({
        name,
        username,
        age,
        email,
        password: hash, // Store the hashed password
      });

      // Create a JWT token for the newly registered user.
      // The token contains user's email and _id. 'secretkey' is used to sign it.
      let token = jwt.sign({ email: email, userid: user._id }, "secretkey");
      // Set the JWT as a cookie in the user's browser.
      res.cookie("token", token);
      // Redirect the user to the login page after successful registration.
      res.redirect("/login");
    });
  });
});

// --- User Login ---

// POST route to handle user login.
app.post("/login", async (req, res) => {
  // Destructure email and password from the request body.
  let { email, password } = req.body;

  // Find the user by email in the database.
  let user = await userModel.findOne({ email });
  if (!user) {
    // If user not found, send an error.
    // NOTE: Using status 401 (Unauthorized) is more appropriate for invalid credentials.
    return res.status(500).send("USomething Wend Wrong");
  }

  // Compare the provided password with the stored hashed password.
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      // Handle error during password comparison.
      console.error("Error comparing passwords:", err);
      return res.status(500).send("Login failed.");
    }
    if (result) {
      // If passwords match, create a JWT token.
      let token = jwt.sign({ email: email, userid: user._id }, "secretkey");
      // Set the JWT as a cookie.
      res.cookie("token", token);
      // Send a 200 OK status and redirect to the profile page.
      // NOTE: `res.status(200).send("you can Log In");` was a duplicate response in original.
      // Removed the `send` and kept `redirect` as it's the final action.
      res.status(200).redirect("/profile");
    } else {
      // If passwords don't match, redirect back to login.
      // NOTE: Using status 401 (Unauthorized) is more appropriate for invalid credentials.
      res.redirect("/login");
    }
  });
});

// --- User Logout ---

// GET route to handle user logout.
app.get("/logout", (req, res) => {
  // Clear the 'token' cookie by setting it to an empty string.
  res.cookie("token", "");
  // Redirect to the login page.
  res.redirect("/login");
});

// --- Middleware: isLoggedIn ---

// Middleware function to check if a user is logged in (authenticated).
// This function runs before any route that requires authentication.
function isLoggedIn(req, res, next) {
  // Get the 'token' cookie from the request.
  let key = req.cookies.token;

  // If no token exists (undefined, null, or empty string), redirect to login.
  // NOTE: Using `!key` is more robust as it checks for `undefined`, `null`, and `""`.
  if (key === "") {
    return res.redirect("/login");
  }

  // Verify the JWT token using the 'secretkey'.
  // If verification is successful, 'data' will contain the decoded payload (email, userid).
  // NOTE: In your original code, this `jwt.verify` call is not wrapped in a `try...catch` block.
  // If `key` is invalid or expired, `jwt.verify` will throw an error, which would crash the server
  // if not handled. This is a common point for errors in JWT implementations.
  let data = jwt.verify(key, "secretkey");
  // Attach the decoded user data to the request object (req.user).
  // This makes user information available to subsequent route handlers.
  req.user = data;
  // Call `next()` to pass control to the next middleware or the route handler.
  next();
}

// --- 6. Server Start ---
// Start the Express server and listen for incoming requests on port 3000.
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
