+----------------+     +----------------+     +----------------+     +----------------+
|                |     |                |     |                |     |                |
|    User's      |     |    Express     |     |    bcrypt      |     |     JWT        |
|    Browser     |     |    App         |     |    (Hashing)   |     |    (Signing/   |
|                |     |                |     |                |     |    Verifying)  |
+-------+--------+     +-------+--------+     +-------+--------+     +-------+--------+
        |                      |                      |                      |
        | 1. Register/Login    |                      |                      |
        |    (POST /register   |                      |                      |
        |     or /login)       |                      |                      |
        |--------------------->|                      |                      |
        |                      |                      |                      |
        |                      | 2. Extract email/pwd |                      |
        |                      |                      |                      |
        |                      | 3. HASH Password     |                      |
        |                      |    (Register)        |                      |
        |                      |--------------------->|                      |
        |                      |                      |                      |
        |                      |<---------------------| 4. Hashed Pwd        |
        |                      |                      |                      |
        |                      | 5. Compare Password  |                      |
        |                      |    (Login)           |                      |
        |                      |--------------------->|                      |
        |                      |                      |                      |
        |                      |<---------------------| 6. Match Result      |
        |                      |                      |                      |
        |                      | 7. Sign JWT          |                      |
        |                      |    (Register/Login)  |                      |
        |                      |--------------------->|                      |
        |                      |                      |                      |
        |                      |<---------------------| 8. JWT Token         |
        |                      |                      |                      |
        |                      | 9. Set 'token' Cookie|                      |
        |                      |    (res.cookie)      |                      |
        |<---------------------|                      |                      |
        | 10. Redirect/Response|                      |                      |
        |                      |                      |                      |
