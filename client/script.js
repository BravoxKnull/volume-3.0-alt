const socket = io("https://your-render-backend-url.onrender.com"); // replace with your deployed backend URL

const channelName = "DUNE PC";
let myStream = null;
let myPeer = null;
let myName = null;
let peers = {}; // key: socketId, value: SimplePeer instance

// DOM Elements
const channelDiv = document.getElementById("channel");
const userListDiv = document.getElementById("userList");
const micToggleBtn = document.getElementById("micToggle");
const leaveBtn = document.getElementById("leaveBtn");
const infoDiv = document.getElementById("info");

// Names to select from
const availableNames = [
  "BLAZEE HACK",
  "VELOZZZ HACK",
  "FLAMEE HACK",
  "STEIKEE HACK",
  "RONINN HACK"
];

// Show the channel name for clicking
channelDiv.innerText = channelName;

channelDiv.onclick = () => {
  // Show names to select
  userListDiv.innerHTML = "<h3>Select your name:</h3>";
  availableNames.forEach(name => {
    const btn = document.createElement("button");
    btn.innerText = name;
    btn.style.margin = "5px";
    btn.onclick = () => selectName(name);
    userListDiv.appendChild(btn);
  });
};

function selectName(name) {
  myName = name;
  userListDiv.innerHTML = `<p>Joining as <b>${myName}</b>...</p>`;
  joinChannel();
}

function joinChannel() {
  socket.emit("join-channel", { channelName, name: myName });

  // Get mic audio
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      myStream = stream;
      // Show mic toggle button enabled
      micToggleBtn.disabled = false;
      micToggleBtn.innerText = "Mute Mic";

      // Inform server ready and listen for other users
      socket.emit("ready-for-call", { channelName, name: myName });

      infoDiv.innerText = `You joined ${channelName} as ${myName}`;
    })
    .catch(err => {
      alert("Microphone access denied or error: " + err.message);
    });
}

// Toggle mic on/off
micToggleBtn.onclick = () => {
  if (!myStream) return;
  const audioTracks = myStream.getAudioTracks();
  if (audioTracks.length === 0) return;

  audioTracks[0].enabled = !audioTracks[0].enabled;
  micToggleBtn.innerText = audioTracks[0].enabled ? "Mute Mic" : "Unmute Mic";
};

// Leave channel
leaveBtn.onclick = () => {
  if (myStream) {
    myStream.getTracks().forEach(track => track.stop());
  }
  for (let peerId in peers) {
    peers[peerId].destroy();
  }
  peers = {};
  socket.emit("leave-channel", { channelName, name: myName });
  myName = null;
  myStream = null;
  userListDiv.innerHTML = "";
  infoDiv.innerText = "You left the channel.";
  micToggleBtn.disabled = true;
};

// Socket.io handlers

// When a new user joins - create peer connection and signal exchange
socket.on("user-joined", ({ socketId, name }) => {
  if (socketId === socket.id) return; // skip self

  // Create peer with initiator = true if we joined first
  const peer = new SimplePeer({
    initiator: true,
    trickle: false,
    stream: myStream
  });

  peer.on("signal", signal => {
    socket.emit("signal", { to: socketId, signal });
  });

  peer.on("stream", remoteStream => {
    addRemoteAudio(socketId, name, remoteStream);
  });

  peers[socketId] = peer;
  updateUserList();
});

// When receiving a signal from another peer
socket.on("signal", ({ from, signal }) => {
  if (!peers[from]) {
    // Create peer as non-initiator
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: myStream
    });

    peer.on("signal", signal => {
      socket.emit("signal", { to: from, signal });
    });

    peer.on("stream", remoteStream => {
      addRemoteAudio(from, "Remote User", remoteStream);
    });

    peers[from] = peer;
  }

  peers[from].signal(signal);
});

// When user leaves the channel
socket.on("user-left", ({ socketId }) => {
  if (peers[socketId]) {
    peers[socketId].destroy();
    delete peers[socketId];
  }
  removeRemoteAudio(socketId);
  updateUserList();
});

// Add audio element for remote stream
function addRemoteAudio(socketId, name, stream) {
  // Remove if already exists
  removeRemoteAudio(socketId);

  const audio = document.createElement("audio");
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.id = "audio-" + socketId;
  audio.controls = false;
  audio.style.display = "none"; // hide audio element

  document.body.appendChild(audio);

  // Add user to list with voice animation placeholder
  const userDiv = document.createElement("div");
  userDiv.id = "user-" + socketId;
  userDiv.innerText = name;
  userDiv.style.margin = "5px";
  userDiv.style.fontWeight = "bold";

  // Voice animation style (simple pulsing)
  userDiv.classList.add("voice-user");

  userListDiv.appendChild(userDiv);
}

// Remove audio element and user from list when user leaves
function removeRemoteAudio(socketId) {
  const audio = document.getElementById("audio-" + socketId);
  if (audio) {
    audio.srcObject = null;
    audio.remove();
  }
  const userDiv = document.getElementById("user-" + socketId);
  if (userDiv) userDiv.remove();
}

function updateUserList() {
  userListDiv.innerHTML = `<h3>Users in ${channelName}:</h3><div id="users-container"></div>`;
  const container = document.getElementById("users-container");
  for (let peerId in peers) {
    const div = document.createElement("div");
    div.innerText = `User ${peerId}`;
    div.style.margin = "3px";
    container.appendChild(div);
  }
  // Add self
  if (myName) {
    const selfDiv = document.createElement("div");
    selfDiv.innerText = `(You) ${myName}`;
    selfDiv.style.margin = "3px";
    selfDiv.style.fontWeight = "bold";
    container.appendChild(selfDiv);
  }
}
