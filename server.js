const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.43.245:5173",
  "https://fello-social.vercel.app",
  "https://localhost",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

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
const musicRoutes = require("./routes/musicRoutes");
const noteRoutes = require("./routes/noteRoutes");

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
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error(
      "MongoDB Connection Error:",
      err.message
    );
  });

const liveStreams = new Map();

const getLiveStream = (streamId) => {
  return liveStreams.get(streamId);
};

const emitViewerCount = (streamId) => {
  const stream = getLiveStream(streamId);

  if (!stream) return;

  const count = stream.viewers.size;

  io.to(`live:${streamId}`).emit(
    "viewer-count",
    {
      streamId,
      count,
    }
  );

  io.to(`live:${streamId}`).emit(
    "live-viewers",
    {
      streamId,
      count,
    }
  );
};

io.on("connection", (socket) => {
  console.log(
    "User connected:",
    socket.id
  );

  socket.on(
    "userOnline",
    async (userId) => {
      try {
        socket.userId = userId;

        await User.findByIdAndUpdate(
          userId,
          {
            isOnline: true,
            lastSeen: null,
          }
        );

        const onlineUsers =
          await User.find(
            { isOnline: true },
            "_id"
          );

        io.emit(
          "onlineUsers",
          onlineUsers.map((user) =>
            user._id.toString()
          )
        );
      } catch (error) {
        console.error(
          "Online Status Error:",
          error
        );
      }
    }
  );

  socket.on("typing", (data) => {
    if (data && data.to) {
      io.to(data.to).emit(
        "userTyping",
        {
          from: socket.userId,
        }
      );
    }
  });

  socket.on("stopTyping", (data) => {
    if (data && data.to) {
      io.to(data.to).emit(
        "userStopTyping",
        {
          from: socket.userId,
        }
      );
    }
  });

  socket.on("call-user", (data) => {
    if (!data?.to) return;

    io.to(data.to).emit(
      "incoming-call",
      {
        from: data.from,
        callerName: data.callerName,
        type: data.type,
      }
    );
  });

  socket.on("call-offer", (data) => {
    if (!data?.to) return;

    io.to(data.to).emit(
      "offer-received",
      {
        offer: data.offer,
        from: socket.id,
      }
    );
  });

  socket.on("call-answer", (data) => {
    if (!data?.to) return;

    io.to(data.to).emit(
      "answer-received",
      {
        answer: data.answer,
      }
    );
  });

  socket.on("ice-candidate", (data) => {
    if (!data?.to) return;

    io.to(data.to).emit(
      "ice-candidate-received",
      {
        candidate: data.candidate,
      }
    );
  });

  socket.on("accept-call", (data) => {
    if (!data?.to) return;

    io.to(data.to).emit(
      "call-accepted"
    );
  });

  socket.on("reject-call", (data) => {
    if (!data?.to) return;

    io.to(data.to).emit(
      "call-rejected"
    );
  });

  socket.on("end-call", (data) => {
    if (!data?.to) return;

    io.to(data.to).emit(
      "call-ended"
    );
  });
  socket.on("start-live", (data) => {
    if (!data?.streamId) return;

    const stream = {
      streamId: data.streamId,
      userId: data.userId || socket.userId || null,
      username: data.username || "User",
      profilePic: data.profilePic || "",
      title: data.title || "Live Stream",
      startedAt:
        data.startedAt ||
        new Date().toISOString(),
      viewers: new Set(),
      likes: new Set(),
      comments: [],
    };

    stream.viewers.add(socket.id);

    liveStreams.set(
      data.streamId,
      stream
    );

    socket.join(
      `live:${data.streamId}`
    );

    socket.liveStreamId =
      data.streamId;

    socket.emit("live-started", {
      streamId: data.streamId,
      title: stream.title,
    });

    emitViewerCount(
      data.streamId
    );
  });

  socket.on(
    "host-started-live",
    (data) => {
      if (!data?.streamId) return;

      socket.join(
        live:${data.streamId}
      );

      socket.liveStreamId =
        data.streamId;
    }
  );

  socket.on("join-live", (data) => {
    if (!data?.streamId) return;

    const stream =
      liveStreams.get(
        data.streamId
      );

    if (!stream) {
      socket.emit(
        "live-not-found",
        {
          streamId:
            data.streamId,
        }
      );

      return;
    }

    socket.join(
      `live:${data.streamId}`
    );

    stream.viewers.add(
      socket.id
    );

    socket.liveStreamId =
      data.streamId;

    socket.emit(
      "live-info",
      {
        streamId:
          stream.streamId,
        userId:
          stream.userId,
        username:
          stream.username,
        profilePic:
          stream.profilePic,
        title:
          stream.title,
        startedAt:
          stream.startedAt,
        viewerCount:
          stream.viewers.size,
        likeCount:
          stream.likes.size,
        comments:
          stream.comments,
      }
    );

    emitViewerCount(
      data.streamId
    );
  });

  socket.on(
    "join-live-stream",
    (data) => {
      if (!data?.streamId) return;

      socket.join(
        `live:${data.streamId}`
      );

      const stream =
        liveStreams.get(
          data.streamId
        );

      if (stream) {
        stream.viewers.add(
          socket.id
        );

        socket.liveStreamId =
          data.streamId;

        emitViewerCount(
          data.streamId
        );
      }
    }
  );

  socket.on(
    "live-comment",
    (data) => {
      if (!data?.streamId) return;

      const stream =
        liveStreams.get(
          data.streamId
        );

      if (!stream) return;

      const comment = {
        id:
          data.id ||
          `${Date.now()}-${socket.id}`,
        streamId:
          data.streamId,
        userId:
          data.userId ||
          socket.userId ||
          null,
        username:
          data.username ||
          "User",
        profilePic:
          data.profilePic ||
          "",
        text:
          String(
            data.text || ""
          )
            .trim()
            .slice(0, 300),
        createdAt:
          data.createdAt ||
          new Date().toISOString(),
      };

      if (!comment.text) return;

      stream.comments.push(
        comment
      );

      if (
        stream.comments.length >
        500
      ) {
        stream.comments =
          stream.comments.slice(
            -500
          );
      }

      io.to(
        `live:${data.streamId}`
      ).emit(
        "live-comment",
        comment
      );

      io.to(
        `live:${data.streamId}`
      ).emit(
        "new-live-comment",
        comment
      );
    }
  );

  socket.on(
    "send-live-comment",
    (data) => {
      if (!data?.streamId) return;

      const stream =
        liveStreams.get(
          data.streamId
        );

      if (!stream) return;

      const comment = {
        id:
          data.id ||
         `${Date.now()}-${socket.id}`,
        streamId:
          data.streamId,
        userId:
          data.userId ||
          socket.userId ||
          null,
        username:
          data.username ||
          "User",
        profilePic:
          data.profilePic ||
          "",
        text:
          String(
            data.text || ""
          )
            .trim()
            .slice(0, 300),
        createdAt:
          data.createdAt ||
          new Date().toISOString(),
      };

      if (!comment.text) return;

      const alreadyExists =
        stream.comments.some(
          (item) =>
            item.id === comment.id
        );

      if (!alreadyExists) {
        stream.comments.push(
          comment
        );
      }

      io.to(
        `live:${data.streamId}`
      ).emit(
        "new-live-comment",
        comment
      );
    }
  );
socket.on("live-like", (data) => {
    if (!data?.streamId) return;

    const stream = liveStreams.get(data.streamId);

    if (!stream) return;

    const likeUserId =
      data.userId ||
      socket.userId ||
      socket.id;

    if (stream.likes.has(likeUserId)) {
      return;
    }

    stream.likes.add(likeUserId);

    const likeCount = stream.likes.size;

    io.to(`live:${data.streamId}`).emit(
      "live-like",
      {
        streamId: data.streamId,
        count: likeCount,
      }
    );

    io.to(`live:${data.streamId}`).emit(
      "live-likes",
      {
        streamId: data.streamId,
        count: likeCount,
      }
    );
  });

  socket.on("like-live", (data) => {
    if (!data?.streamId) return;

    const stream = liveStreams.get(data.streamId);

    if (!stream) return;

    const likeUserId =
      data.userId ||
      socket.userId ||
      socket.id;

    if (stream.likes.has(likeUserId)) {
      return;
    }

    stream.likes.add(likeUserId);

    io.to(`live:${data.streamId}`).emit(
      "live-likes",
      {
        streamId: data.streamId,
        count: stream.likes.size,
      }
    );
  });

  socket.on("live-camera-toggle", (data) => {
    if (!data?.streamId) return;

    socket
      .to(`live:${data.streamId}`)
      .emit("live-camera-toggle", {
        streamId: data.streamId,
        userId: data.userId,
        cameraOn: Boolean(data.cameraOn),
      });
  });

  socket.on("live-mic-toggle", (data) => {
    if (!data?.streamId) return;

    socket
      .to(`live:${data.streamId}`)
      .emit("live-mic-toggle", {
        streamId: data.streamId,
        userId: data.userId,
        micOn: Boolean(data.micOn),
      });
  });
socket.on("leave-live", (data) => {
    if (!data?.streamId) return;

    const stream = liveStreams.get(data.streamId);

    if (!stream) return;

    stream.viewers.delete(socket.id);

    socket.leave(`live:${data.streamId}`);

    if (socket.liveStreamId === data.streamId) {
      socket.liveStreamId = null;
    }

    emitViewerCount(data.streamId);
  });

  socket.on("leave-live-stream", (data) => {
    if (!data?.streamId) return;

    const stream = liveStreams.get(data.streamId);

    if (!stream) return;

    stream.viewers.delete(socket.id);

    socket.leave(live:${data.streamId});

    if (socket.liveStreamId === data.streamId) {
      socket.liveStreamId = null;
    }

    emitViewerCount(data.streamId);
  });

  socket.on("end-live", (data) => {
    if (!data?.streamId) return;

    const stream = liveStreams.get(data.streamId);

    if (!stream) return;

    if (
      stream.userId &&
      data.userId &&
      String(stream.userId) !== String(data.userId)
    ) {
      return;
    }

    io.to(`live:${data.streamId}`).emit("live-ended", {
      streamId: data.streamId,
    });

    io.to(`live:${data.streamId}`).emit("stream-ended", {
      streamId: data.streamId,
    });

    io.in(`live:${data.streamId}`).socketsLeave(
      `live:${data.streamId}`
    );

    liveStreams.delete(data.streamId);

    socket.liveStreamId = null;
  });

  socket.on("host-ended-live", (data) => {
    if (!data?.streamId) return;

    const stream = liveStreams.get(data.streamId);

    if (!stream) return;

    if (
      stream.userId &&
      data.userId &&
      String(stream.userId) !== String(data.userId)
    ) {
      return;
    }

    io.to(`live:${data.streamId}`).emit("stream-ended", {
      streamId: data.streamId,
    });

    io.in(`live:${data.streamId}`).socketsLeave(
      `live:${data.streamId}`
    );

    liveStreams.delete(data.streamId);

    socket.liveStreamId = null;
  });
socket.on("disconnect", async () => {
    console.log(
      "User disconnected:",
      socket.id
    );

    if (socket.liveStreamId) {
      const streamId =
        socket.liveStreamId;

      const stream =
        liveStreams.get(streamId);

      if (stream) {
        if (
          String(stream.userId) ===
          String(socket.userId)
        ) {
          io.to(
            `live:${streamId}`
          ).emit(
            "stream-ended",
            {
              streamId,
            }
          );

          io.in(
            `live:${streamId}`
          ).socketsLeave(
            `live:${streamId}`
          );

          liveStreams.delete(
            streamId
          );
        } else {
          stream.viewers.delete(
            socket.id
          );

          emitViewerCount(
            streamId
          );
        }
      }
    }

    try {
      if (socket.userId) {
        await User.findByIdAndUpdate(
          socket.userId,
          {
            isOnline: false,
            lastSeen: new Date(),
          }
        );

        const onlineUsers =
          await User.find(
            { isOnline: true },
            "_id"
          );

        io.emit(
          "onlineUsers",
          onlineUsers.map(
            (user) =>
              user._id.toString()
          )
        );
      }
    } catch (error) {
      console.error(
        "Offline status Error:",
        error
      );
    }
  });
});

const PORT =
  process.env.PORT || 5000;

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Server is running on port ${PORT}`
    );
  }
);
