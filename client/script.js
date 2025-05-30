const socket = io();
let myStream;
let mediaRecorder;
let myName = "";

function joinChannel() {
  myName = document.getElementById("nameSelect").value;
  document.getElementById("selectName").classList.add("hidden");
  document.getElementById("chatRoom").classList.remove("hidden");
  document.getElementById("myName").innerText = `👤 You: ${myName}`;
  socket.emit("join", { name: myName });
  startMic();
}

function leaveChannel() {
  location.reload();
}

function toggleMic() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  } else {
    startMic();
  }
}

function startMic() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    myStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start(300);

    mediaRecorder.ondataavailable = (e) => {
      socket.emit("audio", e.data);
    };
  });
}

const peers = {};

socket.on("user-list", (users) => {
  const userList = document.getElementById("userList");
  userList.innerHTML = "";
  Object.entries(users).forEach(([id, name]) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.id = `user-${id}`;
    userList.appendChild(li);
  });
});

socket.on("audio", ({ id, audio }) => {
  const blob = new Blob([audio], { type: "audio/webm;codecs=opus" });
  const audioElem = new Audio(URL.createObjectURL(blob));
  audioElem.play();

  const userElem = document.getElementById(`user-${id}`);
  if (userElem) {
    userElem.classList.add("talking");
    setTimeout(() => userElem.classList.remove("talking"), 1000);
  }
});
// Capture mic
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
.then(stream => {
  myStream = stream;
  // Add stream to peer connections
})
.catch(console.error);

// On receiving stream from remote peer
peer.on('stream', remoteStream => {
  const audio = document.createElement('audio');
  audio.srcObject = remoteStream;
  audio.autoplay = true;
  document.body.appendChild(audio);
});
