const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const musicRoutes = require("./routes/musicRoutes");
const noteRoutes = require("./routes/noteRoutes");
require("dotenv").config();
const app = express();
const server = http.createServer(app);
const allowedOrigins = [
    "http://localhost:5173",
    "http://192.168.43.245:5173",
    "https://fello-social.vercel.app"
];

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const postRoutes = require("./routes/postRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reelRoutes = require("./routes/reelRoutes");
const reportRoutes = require("./routes/reportRoutes");
const User = require("./models/User");


app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/music", musicRoutes);
app.use("/api/notes", noteRoutes);


app.get("/", (req, res) => {
    res.send("Social Media API Running");

});

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
  });
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("userOnline", async(userId) => {
        try{
            socket.userId = userId;
            await User.findByIdAndUpdate(userId, {
                isOnline: true,
                lastSeen: null,
            });
            console.log("User is online:", userId); 
            const onlineUsers = await User.find(
                { isOnline: true },
                "-id"
            );
            io.emit("onlineUsers",
                onlineUsers.map((user) => user._id.toString())
            );

        } catch (error) {
            console.error("Online Status Error:", error);
        }
    });
    socket.on("typing", (data) => {
        socket.broadcast.emit("userTyping", data);
    });
    socket.on("stopTyping", (data) => {
        socket.broadcast.emit("userStopTyping", data);
    });
    socket.on("call-user", (data) => {
  io.to(data.to).emit("incoming-call", {
    from: data.from,
    callerName: data.callerName,
    type: data.type, // "audio" ya "video"
  });
});
  socket.on("call-offer", (data) => {
  io.to(data.to).emit("offer-received", {
    offer: data.offer,
    from: socket.id,
  });
});
socket.on("call-answer", (data) => {
  io.to(data.to).emit("answer-received", {
    answer: data.answer,
  });
});
socket.on("ice-candidate", (data) => {
  io.to(data.to).emit("ice-candidate-received", {
    candidate: data.candidate,
  });
});

socket.on("accept-call", (data) => {
  io.to(data.to).emit("call-accepted");
});

socket.on("reject-call", (data) => {
  io.to(data.to).emit("call-rejected");
});

socket.on("end-call", (data) => {
  io.to(data.to).emit("call-ended");
});
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        try{ if (socket.userId) {
            User.findByIdAndUpdate(socket.userId, {
                isOnline: false,
                lastSeen: new Date(),
            });
            console.log("User is offline:", socket.userId);
        }
    } catch (error) {
        console.error("Offline status Error:", error);
    }
    });
});
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});


