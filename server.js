// // const express = require('express');
// // const cors = require('cors');
// // require('dotenv').config();

// // const { connectDB } = require('./db'); 
// // const apiRoutes = require('./routes/apiRoutes');
// // const doctorRoutes = require('./routes/doctorRoutes');  
// // const scheduleRoutes = require('./routes/scheduleRoutes');
// // const specializationRoutes = require('./routes/specializationRoutes');
// // const appointmentRoutes = require('./routes/appointmentRoutes');
// // const adminRoutes = require('./routes/adminRoutes.js');
// // const videoRoutes = require('./routes/videoRoutes.js');
// // // ... existing imports ...
// // const ehrRoutes = require('./routes/ehrRoutes');
// // const trackerRoutes = require('./routes/trackerRoutes');
// // const subscriptionRoutes = require('./routes/subscriptionRoutes.js');

// // // MAKE UPLOADS FOLDER PUBLIC (Very Important for frontend to view the images/PDFs)

// // // Register the EHR routes

// // // ... existing server start logic ...

// // const app = express();
// // app.use(cors());
// // app.use(express.json());

// // // Main API Routes
// // app.use('/api', apiRoutes);   
// // app.use('/api/doctors', doctorRoutes);
// // app.use('/api/schedule',scheduleRoutes);
// // app.use('/api/specializations', specializationRoutes);
// // app.use('/api/appointments',appointmentRoutes);
// // app.use('/api/admin',adminRoutes);
// // app.use('/api',videoRoutes);
// // app.use('/api/ehr', ehrRoutes);
// // app.use('/uploads', express.static('uploads'));
// // app.use('/api/trackers',trackerRoutes);
// // app.use('/api/subscriptions',subscriptionRoutes);  



// // app.get("/", (req, res) => {
// //     console.log("api is working");
// //     res.send("Medistry API is working perfectly! 🚀");
// // });

// // const PORT = process.env.PORT || 3000;

// // app.listen(PORT, async () => {
// //     console.log(`Server is running on port = ${PORT} !`);
// //     await connectDB();
// // });





// const express = require('express');
// const jwt = require('jsonwebtoken'); 
// const http = require('http'); // Required to run both Express and Socket.IO on the same port
// const { Server } = require('socket.io'); 
// const cors = require('cors');
// require('dotenv').config();

// // =========================================================================
// // DATABASE CONNECTION
// // =========================================================================
// const { connectDB, sql } = require('./db'); 

// const app = express();

// // =========================================================================
// // PART 1: EXPRESS REST API ROUTES & MIDDLEWARES
// // =========================================================================

// // Middlewares
// app.use(cors());
// app.use(express.json());
// // Expose the uploads folder so frontend can access shared files/images via URL
// app.use('/uploads', express.static('uploads'));

// // Import Route Modules
// const apiRoutes = require('./routes/apiRoutes');
// const doctorRoutes = require('./routes/doctorRoutes');  
// const scheduleRoutes = require('./routes/scheduleRoutes');
// const specializationRoutes = require('./routes/specializationRoutes');
// const appointmentRoutes = require('./routes/appointmentRoutes');
// const adminRoutes = require('./routes/adminRoutes');
// const videoRoutes = require('./routes/videoRoutes');
// const ehrRoutes = require('./routes/ehrRoutes');
// const trackerRoutes = require('./routes/trackerRoutes');
// const subscriptionRoutes = require('./routes/subscriptionRoutes');
// const chatRoutes = require('./routes/chatRoutes'); 
// const labRoutes = require('./routes/labRoutes');
// const addressRoutes = require('./routes/addressRoutes');
// const patientRoutes = require('./routes/patientRoutes');

// // Mount Routes
// app.use('/api', apiRoutes);   
// app.use('/api/doctors', doctorRoutes);
// app.use('/api/schedule', scheduleRoutes);
// app.use('/api/specializations', specializationRoutes);
// app.use('/api/appointments', appointmentRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api', videoRoutes);
// app.use('/api/ehr', ehrRoutes);
// app.use('/api/trackers', trackerRoutes);
// app.use('/api/subscriptions', subscriptionRoutes);
// app.use('/api/chat', chatRoutes); 
// app.use('/api/labs', labRoutes);
// app.use('/api/address',addressRoutes);
// app.use('/api/patient', patientRoutes); 

// // Basic Health Check API
// app.get("/", (req, res) => {
//     res.send("Medistry API + Dual Real-Time Chat Engine is running perfectly! 🚀");
// });


// // =========================================================================
// // PART 2: SOCKET.IO REAL-TIME CHAT ENGINE (WebSockets)
// // =========================================================================

// // Wrap Express app into a raw HTTP server to bind Socket.IO
// const server = http.createServer(app);

// // Initialize Socket.IO instance
// const io = new Server(server, {
//     cors: {
//         origin: "*", // Allows any frontend domain to connect. Change this in production.
//         methods: ["GET", "POST"]
//     }
// });




// // =========================================================================
// // [NEW] SOCKET.IO AUTHENTICATION MIDDLEWARE (The Gatekeeper)
// // =========================================================================
// io.use((socket, next) => {
//     // 1. recieve token from frontend
//     const token = socket.handshake.auth.token;

//     // 2. id token is not present then reject tha request
//     if (!token) {
//         console.log("🚫 Connection Rejected: Token missing");
//         return next(new Error("Authentication error: Token missing"));
//     }

//     try {
//         // 3. verify token with secret key
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
//         // 4. token is coreent save user infor userid and role
//         socket.user = decoded; 
        
//         // 5. Connection allowed
//         next(); 
//     } catch (err) {
//         console.log("🚫 Connection Rejected: Invalid/Expired Token");
//         return next(new Error("Authentication error: Invalid or expired token"));
//     }
// });



// io.on('connection', (socket) => {
//     console.log(`🔌 New Web-Socket Connected: ${socket.id}`);

//     // ---------------------------------------------------------------------
//     // SYSTEM A: PRIVATE DOCTOR-PATIENT CONSULTATION
//     // STRICT RULE: Only assigned Patient and assigned Doctor can communicate.
//     // ---------------------------------------------------------------------
    
//     // Listen for room join requests for medical consultations
//     socket.on('join_consultation', (sessionId) => {
//         socket.join(`consultation_${sessionId}`);
//         console.log(`⚕️ User joined Medical Room: consultation_${sessionId}`);
//     });

//     // Listen for incoming consultation messages
//     socket.on('send_consultation_message', async (data) => {
//         const { sessionId, senderUserId, senderRole, messageType, messageText, fileUrl } = data;

//         try {
//             const pool = await connectDB();

//             // STEP 1: Fetch chat session metadata from the database
//             const sessionCheck = await pool.request()
//                 .input('SessionId', sql.Int, sessionId)
//                 .query(`SELECT PatientId, DoctorId, Status FROM ChatSessions WHERE SessionId = @SessionId`);

//             if (sessionCheck.recordset.length === 0 || sessionCheck.recordset[0].Status !== 'Active') {
//                 return socket.emit('error_message', { message: 'Chat session invalid or closed.' });
//             }

//             const session = sessionCheck.recordset[0];
//             const role = senderRole.toUpperCase();
//             let isAuthorized = false;

//             // STEP 2: Strict authorization verification
//             if (role === 'PATIENT' && session.PatientId === senderUserId) {
//                 // Sender is the actual patient mapped to this session
//                 isAuthorized = true; 
//             } 
//             else if (role === 'DOCTOR') {
//                 // Sender is a doctor. Cross-check if their internal DoctorId matches the session.
//                 const doctorProfile = await pool.request()
//                     .input('UserId', sql.Int, senderUserId)
//                     .query(`SELECT DoctorId FROM Doctors WHERE UserId = @UserId`);

//                 if (doctorProfile.recordset.length > 0 && doctorProfile.recordset[0].DoctorId === session.DoctorId) {
//                     isAuthorized = true; 
//                 }
//             }
            
//             // Block anyone else (including Admins/Hackers)
//             if (!isAuthorized) {
//                 console.log(`🚨 PRIVACY BLOCK: Unauthorized access attempt on Consultation ${sessionId}`);
//                 return socket.emit('error_message', { message: 'Unauthorized medical access blocked.' });
//             }

//             // STEP 3: Broadcast the message securely to the specific room
//             io.to(`consultation_${sessionId}`).emit('receive_consultation_message', data);

//             // STEP 4: Persist the message in the database
//             await pool.request()
//                 .input('SessionId', sql.Int, sessionId)
//                 .input('SenderId', sql.Int, senderUserId) 
//                 .input('SenderRole', sql.VarChar, role) 
//                 .input('MessageType', sql.VarChar, messageType || 'TEXT')
//                 .input('MessageText', sql.NVarChar, messageText || '')
//                 .input('FileUrl', sql.NVarChar, fileUrl || null)
//                 .query(`
//                     INSERT INTO ChatMessages (SessionId, SenderId, SenderRole, MessageType, MessageText, FileUrl, IsRead)
//                     VALUES (@SessionId, @SenderId, @SenderRole, @MessageType, @MessageText, @FileUrl, 0)
//                 `);

//         } catch (err) {
//             console.error("❌ Consultation Chat DB Error:", err);
//         }
//     });


//     // ---------------------------------------------------------------------
//     // SYSTEM B: HELPDESK & IT SUPPORT (Ticket-Based)
//     // RULE: Patients/Doctors can chat with Admins to resolve app issues.
//     // ---------------------------------------------------------------------
    
//     // Support room uses the User's ID to keep their IT tickets separate
//     socket.on('join_support', (supportUserId) => {
//         socket.join(`support_${supportUserId}`);
//         console.log(`🛠️ User joined IT Support Room: support_${supportUserId}`);
//     });

//     socket.on('send_support_message', async (data) => {
//         // supportUserId: ID of the person who needs help
//         // senderUserId: ID of the person currently typing the message (Admin or the User)
//         const { supportUserId, senderUserId, senderRole, messageText, fileUrl } = data;

//         try {
//             const role = senderRole.toUpperCase();
//             let isAuthorized = false;

//             // Authorization: Only Admin, IT, or the User themselves can send messages here
//             if (role === 'ADMIN' || role === 'IT') {
//                 isAuthorized = true; 
//             } else if (senderUserId === supportUserId) {
//                 isAuthorized = true; 
//             }

//             if (!isAuthorized) {
//                 console.log(`🚨 SUPPORT BLOCK: User ${senderUserId} tried to access someone else's support ticket.`);
//                 return socket.emit('error_message', { message: 'Unauthorized support access blocked.' });
//             }

//             // Broadcast message to the support room immediately
//             io.to(`support_${supportUserId}`).emit('receive_support_message', data);

//             // Database Persistence Logic for Support Chat
//             const pool = await connectDB();
//             let ticketId;

//             // STEP 1: Check if there is an active (Open) ticket for this user
//             const ticketCheck = await pool.request()
//                 .input('UserId', sql.Int, supportUserId)
//                 .query(`SELECT TOP 1 TicketId FROM SupportTickets WHERE UserId = @UserId AND Status = 'Open' ORDER BY CreatedAt DESC`);

//             if (ticketCheck.recordset.length > 0) {
//                 ticketId = ticketCheck.recordset[0].TicketId;
//             } else {
//                 // STEP 2: Auto-create a new ticket if none exists (Industry Standard)
//                 const newTicket = await pool.request()
//                     .input('UserId', sql.Int, supportUserId)
//                     .input('Subject', sql.NVarChar, 'General App Support Request') 
//                     .query(`
//                         INSERT INTO SupportTickets (UserId, Subject, Status) 
//                         OUTPUT INSERTED.TicketId 
//                         VALUES (@UserId, @Subject, 'Open')
//                     `);
//                 ticketId = newTicket.recordset[0].TicketId;
//                 console.log(`🎫 New Support Ticket Created: #${ticketId}`);
//             }

//             // STEP 3: Insert the actual message into SupportMessages table
//             // Note: The SQL Trigger (trg_UpdateTicketTime) will automatically update the Ticket's 'UpdatedAt' timestamp!
//             await pool.request()
//                 .input('TicketId', sql.Int, ticketId)
//                 .input('SenderId', sql.Int, senderUserId)
//                 .input('SenderRole', sql.VarChar, role)
//                 .input('MessageText', sql.NVarChar, messageText || '')
//                 .input('FileUrl', sql.NVarChar, fileUrl || null)
//                 .query(`
//                     INSERT INTO SupportMessages (TicketId, SenderId, SenderRole, MessageText, FileUrl, IsRead)
//                     VALUES (@TicketId, @SenderId, @SenderRole, @MessageText, @FileUrl, 0)
//                 `);
            
//             console.log(`💾 Support message saved for Ticket #${ticketId} by ${role}`);

//         } catch (err) {
//             console.error("❌ Support Chat DB Error:", err);
//         }
//     });

//     // Handle user disconnection cleanly
//     socket.on('disconnect', () => {
//         console.log(`❌ User Disconnected: ${socket.id}`);
//     });
// });


// // =========================================================================
// // PART 3: SERVER STARTUP
// // =========================================================================

// const PORT = process.env.PORT || 3000;

// // Note: server.listen boots BOTH the Express REST API and the Socket.IO Engine
// server.listen(PORT, async () => {
//     console.log(`🚀 Medistry Server is running on port = ${PORT}`);
//     await connectDB();       ]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
// });      
require('./utils/cronJobs')();
const express = require('express');
const jwt = require('jsonwebtoken'); 
const http = require('http'); // Required to run both Express and Socket.IO on the same port
const { Server } = require('socket.io'); 
const cors = require('cors');
require('dotenv').config();

// =========================================================================
// DATABASE CONNECTION
// =========================================================================
const { connectDB, sql } = require('./db'); 

const app = express();

// =========================================================================
// PART 1: EXPRESS REST API ROUTES & MIDDLEWARES
// =========================================================================

// CORS Middleware
app.use(cors());

// 🚨 CRITICAL FIX FOR RAZORPAY WEBHOOK 🚨
// Webhook from Razorpay sends raw JSON payload, so we need to use express.raw() middleware for that specific route. This ensures the signature verification works correctly.
app.use('/api/payments/razorpay/webhook', express.raw({ type: 'application/json' }));

// Standard Body Parser Middleware fro remaining all routes (JSON payloads)
app.use(express.json());

// Expose the uploads folder so frontend can access shared files/images via URL
app.use('/uploads', express.static('uploads'));

// Import Route Modules
const apiRoutes = require('./routes/apiRoutes');
const doctorRoutes = require('./routes/doctorRoutes');  
const scheduleRoutes = require('./routes/scheduleRoutes');
const specializationRoutes = require('./routes/specializationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const videoRoutes = require('./routes/videoRoutes');
const ehrRoutes = require('./routes/ehrRoutes');
const trackerRoutes = require('./routes/trackerRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const chatRoutes = require('./routes/chatRoutes'); 
const labRoutes = require('./routes/labRoutes');
const addressRoutes = require('./routes/addressRoutes');
const patientRoutes = require('./routes/patientRoutes');

// 🚀 NEW: Import Payment Routes
const paymentRoutes = require('./routes/paymentRoutes');

// Mount Routes
app.use('/api', apiRoutes);   
app.use('/api/doctors', doctorRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', videoRoutes);
app.use('/api/ehr', ehrRoutes);
app.use('/api/trackers', trackerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/chat', chatRoutes); 
app.use('/api/labs', labRoutes);
app.use('/api/address',addressRoutes);
app.use('/api/patient', patientRoutes); 

// 🚀 NEW: Mount Payment Routes
app.use('/api/payments', paymentRoutes); 

// Basic Health Check API
app.get("/", (req, res) => {
    res.send("Medistry API + Dual Real-Time Chat Engine + Payments is running perfectly! 🚀");
});


// =========================================================================
// PART 2: SOCKET.IO REAL-TIME CHAT ENGINE (WebSockets)
// =========================================================================

// Wrap Express app into a raw HTTP server to bind Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO instance
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// =========================================================================
// [NEW] SOCKET.IO AUTHENTICATION MIDDLEWARE (The Gatekeeper)
// =========================================================================
io.use((socket, next) => {
    // 1. Receive token from frontend (either via auth or headers)
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
        console.log("🚫 Connection Rejected: Token missing");
        return next(new Error("Authentication error: Token missing"));
    }

    try {
        // 2. Verify token with secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Token is valid, attach user info to socket for later use
        socket.user = decoded; 
        next(); 
    } catch (err) {
        console.log("🚫 Connection Rejected: Invalid/Expired Token");
        return next(new Error("Authentication error: Invalid or expired token. Please login again."));
    }
});

io.on('connection', (socket) => {
    console.log(`🔌 New Web-Socket Connected: ${socket.id} (UserId: ${socket.user.userId})`);

    // ---------------------------------------------------------------------
    // SYSTEM A: PRIVATE DOCTOR-PATIENT CONSULTATION
    // ---------------------------------------------------------------------
    socket.on('join_consultation', (sessionId) => {
        socket.join(`consultation_${sessionId}`);
        console.log(`⚕️ User ${socket.user.userId} joined Medical Room: consultation_${sessionId}`);
    });

    socket.on('send_consultation_message', async (data) => {
        // Destructure the incoming data        
        const { sessionId, messageType, messageText, fileUrl } = data;
        const senderUserId = socket.user.userId; 
        const senderRole = socket.user.role.toUpperCase();

        try {
            const pool = await connectDB();

            const sessionCheck = await pool.request()
                .input('SessionId', sql.Int, sessionId)
                .query(`SELECT PatientId, DoctorId, Status FROM ChatSessions WHERE SessionId = @SessionId`);

            if (sessionCheck.recordset.length === 0 || sessionCheck.recordset[0].Status !== 'Active') {
                return socket.emit('error_message', { message: 'Chat session invalid or closed.' });
            }

            const session = sessionCheck.recordset[0];
            let isAuthorized = false;

            // Authorization Logic
            if (senderRole === 'PATIENT' && session.PatientId === senderUserId) {
                isAuthorized = true; 
            } 
            else if (senderRole === 'DOCTOR') {
                const doctorProfile = await pool.request()
                    .input('UserId', sql.Int, senderUserId)
                    .query(`SELECT DoctorId FROM Doctors WHERE UserId = @UserId`);

                if (doctorProfile.recordset.length > 0 && doctorProfile.recordset[0].DoctorId === session.DoctorId) {
                    isAuthorized = true; 
                }
            }
            
            if (!isAuthorized) {
                console.log(`🚨 PRIVACY BLOCK: Unauthorized access attempt on Consultation ${sessionId}`);
                return socket.emit('error_message', { message: 'Unauthorized medical access blocked.' });
            }

            // Broadcast the message securely to the specific room
            const secureMessagePayload = {
                sessionId,
                senderUserId,
                senderRole,
                messageType: messageType || 'TEXT',
                messageText: messageText || '',
                fileUrl: fileUrl || null,
                createdAt: new Date().toISOString()
            };

            io.to(`consultation_${sessionId}`).emit('receive_consultation_message', secureMessagePayload);

            // DB Save
            await pool.request()
                .input('SessionId', sql.Int, sessionId)
                .input('SenderId', sql.Int, senderUserId) 
                .input('SenderRole', sql.VarChar, senderRole) 
                .input('MessageType', sql.VarChar, messageType || 'TEXT')
                .input('MessageText', sql.NVarChar, messageText || '')
                .input('FileUrl', sql.NVarChar, fileUrl || null)
                .query(`
                    INSERT INTO ChatMessages (SessionId, SenderId, SenderRole, MessageType, MessageText, FileUrl, IsRead)
                    VALUES (@SessionId, @SenderId, @SenderRole, @MessageType, @MessageText, @FileUrl, 0)
                `);

        } catch (err) {
            console.error("❌ Consultation Chat DB Error:", err);
        }
    });

    // ---------------------------------------------------------------------
    // SYSTEM B: HELPDESK & IT SUPPORT (Ticket-Based)
    // ---------------------------------------------------------------------
    socket.on('join_support', (supportUserId) => {
        socket.join(`support_${supportUserId}`);
        console.log(`🛠️ User joined IT Support Room: support_${supportUserId}`);
    });

    socket.on('send_support_message', async (data) => {
        // Destructure the incoming data
        const { supportUserId, messageText, fileUrl } = data;
        const senderUserId = socket.user.userId;
        const senderRole = socket.user.role.toUpperCase();

        try {
            let isAuthorized = false;

            if (senderRole === 'ADMIN' || senderRole === 'IT') {
                isAuthorized = true; 
            } else if (senderUserId === supportUserId) {
                isAuthorized = true; 
            }

            if (!isAuthorized) {
                console.log(`🚨 SUPPORT BLOCK: User ${senderUserId} tried to access someone else's support ticket.`);
                return socket.emit('error_message', { message: 'Unauthorized support access blocked.' });
            }

            const secureSupportPayload = {
                supportUserId,
                senderUserId,
                senderRole,
                messageText: messageText || '',
                fileUrl: fileUrl || null,
                createdAt: new Date().toISOString()
            };

            io.to(`support_${supportUserId}`).emit('receive_support_message', secureSupportPayload);

            const pool = await connectDB();
            let ticketId;

            const ticketCheck = await pool.request()
                .input('UserId', sql.Int, supportUserId)
                .query(`SELECT TOP 1 TicketId FROM SupportTickets WHERE UserId = @UserId AND Status = 'Open' ORDER BY CreatedAt DESC`);

            if (ticketCheck.recordset.length > 0) {
                ticketId = ticketCheck.recordset[0].TicketId;
            } else {
                const newTicket = await pool.request()
                    .input('UserId', sql.Int, supportUserId)
                    .input('Subject', sql.NVarChar, 'General App Support Request') 
                    .query(`
                        INSERT INTO SupportTickets (UserId, Subject, Status) 
                        OUTPUT INSERTED.TicketId 
                        VALUES (@UserId, @Subject, 'Open')
                    `);
                ticketId = newTicket.recordset[0].TicketId;
                console.log(`🎫 New Support Ticket Created: #${ticketId}`);
            }

            await pool.request()
                .input('TicketId', sql.Int, ticketId)
                .input('SenderId', sql.Int, senderUserId)
                .input('SenderRole', sql.VarChar, senderRole)
                .input('MessageText', sql.NVarChar, messageText || '')
                .input('FileUrl', sql.NVarChar, fileUrl || null)
                .query(`
                    INSERT INTO SupportMessages (TicketId, SenderId, SenderRole, MessageText, FileUrl, IsRead)
                    VALUES (@TicketId, @SenderId, @SenderRole, @MessageText, @FileUrl, 0)
                `);
            
            console.log(`💾 Support message saved for Ticket #${ticketId} by ${senderRole}`);

        } catch (err) {
            console.error("❌ Support Chat DB Error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User Disconnected: ${socket.id}`);
    });
});
// =========================================================================
// PART 3: SERVER STARTUP
// =========================================================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`🚀 Medistry Server is running on port = ${PORT}`);
    await connectDB();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
});