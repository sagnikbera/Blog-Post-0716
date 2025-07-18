+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   Post Document   |     |   User Document   |     |   Express App     |
|   (in MongoDB)    |     |   (in MongoDB)    |     |                   |
|                   |     |                   |     |                   |
+---------+---------+     +---------+---------+     +---------+---------+
          |                         |                         |
          |                         |                         |
          | 1. User clicks Delete (GET /delete/:id)           |
          |--------------------------------------------------->|
          |                         |                         |
          |                         | 2. Find Post to get Author ID |
          |                         |   (postModel.findById)  |
          |<------------------------|                         |
          |                         |                         |
          |                         | 3. Delete Post Document |
          |                         |   (postModel.findByIdAndDelete)|
          |------------------------>|                         |
          |                         |                         |
          |                         | 4. Remove Post ID from User's 'posts' array |
          |                         |   (userModel.findByIdAndUpdate with $pull)|
          |                         |------------------------>|
          |                         |                         |
          |                         |<------------------------|
          |                         |                         |
          |                         | 5. Redirect to Profile  |
          |                         |                         |
