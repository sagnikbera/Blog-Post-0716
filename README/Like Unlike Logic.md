+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   Post Document   |     |   Check 'likes'   |     |   Update 'likes'  |
|   (in MongoDB)    |     |   Array (indexOf) |     |   Array (push/splice)|
|                   |     |                   |     |                   |
+---------+---------+     +---------+---------+     +---------+---------+
          |                         |                         |
          |                         |                         |
          | 1. User clicks Like/Unlike (GET /like/:id)        |
          |--------------------------------------------------->|
          |                         |                         |
          |                         | 2. Find Post by ID      |
          |                         |   (postModel.findOne)   |
          |<------------------------|                         |
          |                         |                         |
          |                         | 3. Is user._id in post.likes?|
          |                         |   (post.likes.indexOf(req.user.userid) === -1)|
          |                         |                         |
          |                         |  NO (User hasn't liked) |  YES (User has liked)
          |                         |--------------------|--------------------|
          |                         |                    |                    |
          |                         V                    V                    V
          |                         |                    |                    |
          |                         | 4a. Add user._id   | 4b. Remove user._id|
          |                         |     (post.likes.push)| (post.likes.splice)|
          |                         |                    |                    |
          |                         |                    |                    |
          |                         |<-------------------|--------------------|
          |                         | 5. Save Post        |
          |                         |   (post.save())     |
          |------------------------>|                     |
          |                         |                     |
          |                         | 6. Redirect to Profile/AllPosts |
          |                         |                     |