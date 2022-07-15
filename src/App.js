import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Peer } from "peerjs";
import sound from "./asset/original-poco-ringtone.mp3";
import { Modal, Button } from "react-bootstrap";

let socket;
let peer;
const App = () => {
	const [peerId, setPeerId] = useState();
	const [myId, setMyId] = useState([]);
	const [users, setUsers] = useState([]);
	const [videoInput, setVideoInput] = useState(false);
	const [audio] = useState(new Audio(sound));
	const [playing, setPlaying] = useState(false);
	const [callCame, setCallCame] = useState(false);
	const [receivedCall, setReceivedCall] = useState(false);
	const [callerUser, setCallerUser] = useState();
	const [call, setCall] = useState();
	const [stream, setStream] = useState();

	// const { isOpen, onOpen, onClose } = useDisclosure();
	const friendVideo = useRef();
	const myVideo = useRef();

	const [show, setShow] = useState(true);

	const handleClose = () => setShow(false);
	// const handleShow = () => setShow(true);

	useEffect(() => {
		navigator.mediaDevices
			.enumerateDevices()
			.then(function (devices) {
				devices.forEach(function (device) {
					if (device.kind === "videoinput") {
						setVideoInput(true);
					}
				});
			})
			.catch(function (err) {
				console.log(err.name + ": " + err.message);
			});
	}, []);

	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia({ video: videoInput, audio: true })
			.then((stream) => {
				setStream(stream);
			});
	}, []);

	useEffect(() => {
		socket = io.connect("http://localhost:5000");
		// socket = io.connect("https://peerjsvideochatbackend.herokuapp.com/");

		socket.emit("join", peerId);

		socket.on("myInfo", (myInfo) => {
			setMyId(myInfo);
		});

		socket.on("allusers", (allusers) => {
			setUsers(allusers);
		});

		socket.on("calling", (data) => {
			setCallerUser(data);
			setCallCame(true);
			setPlaying(true);
		});

		socket.on("callAccepted", (data) => {
			// console.log("callAccepted", data);
			setReceivedCall(true);
			setCallerUser(data);
		});

		return () => {
			socket.disconnect();
		};
	}, [peerId]);

	// console.log(callerUser);

	useEffect(() => {
		peer = new Peer();
		peer.on("open", function (id) {
			setPeerId(id);
		});

		return () => {
			peer.disconnect();
		};
	}, []);

	// console.log(receivedCall);

	useEffect(() => {
		var getUserMedia =
			navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia;

		peer.on("call", function (call) {
			setCall(call);

			// getUserMedia(
			// 	{ video: videoInput, audio: true },
			// 	function (stream) {
			// 		// Answer the call with an A/V stream.
			// 		// setCallCame(true);
			// 		// setPlaying(true);
			// 		// audio.loop = true;
			// 		// playing && audio.play();
			// 		setStream(stream);

			// 		// receiveFriendCall(call, stream);
			// 	},
			// 	function (err) {
			// 		console.log("Failed to get local stream", err);
			// 	}
			// );
		});
	}, [receivedCall, videoInput]);

	const receiveFriendCall = () => {
		// const answerCall = window.confirm("Do you want to answer?");

		// if (answerCall) {
		// setReceivedCall(true);
		// setPlaying(false);

		// console.log(receivedCall);
		// if (receivedCall === false) {
		// 	return;
		// }
		call.answer(stream);

		myVideo.current.srcObject = stream;
		myVideo.current.play();

		call.on("stream", function (remoteStream) {
			// Show stream in some video/canvas element.
			// if (receivedCall === true) {
			friendVideo.current.srcObject = remoteStream;
			friendVideo.current.play();
			// }
		});
		// }
	};

	if (playing === true) {
		// audio.loop = true;
		playing && audio.play();
	}

	const callFriend = (friendId, friendSocketID) => {
		socket.emit("callingTo", {
			friendId: friendId,
			myId: myId,
			friendSocketID: friendSocketID,
		});

		// var getUserMedia =
		// 	navigator.getUserMedia ||
		// 	navigator.webkitGetUserMedia ||
		// 	navigator.mozGetUserMedia;
		// getUserMedia(
		// 	{ video: videoInput, audio: true },
		// 	function (stream) {
		var call = peer.call(friendId, stream);
		myVideo.current.srcObject = stream;
		myVideo.current.play();
		call.on("stream", function (remoteStream) {
			friendVideo.current.srcObject = remoteStream;
			friendVideo.current.play();
		});
		// 	},
		// 	function (err) {
		// 		console.log("Failed to get local stream", err);
		// 	}
		// );
	};

	const endcall = () => {
		peer.destroy();
	};
	const handleReceive = () => {
		setShow(false);
		setReceivedCall(true);
		setPlaying(false);
		audio.pause();
		audio.currentTime = 0;
		socket.emit("calledAcceptedBy", {
			friendId: callerUser.myId.peerId,
			myId: {
				peerId: callerUser.friendId,
				socketId: callerUser.friendSocketID,
			},
			friendSocketID: callerUser.myId.socketId,
		});
		receiveFriendCall();
	};

	const receiveCallModal = () => {
		return (
			<>
				<Modal show={show} onHide={handleClose}>
					<Modal.Header closeButton>
						<Modal.Title>Receive Call</Modal.Title>
					</Modal.Header>
					<Modal.Body>Woohoo, {callerUser.myId.peerId} Called You</Modal.Body>
					<Modal.Footer>
						<Button variant='secondary' onClick={handleClose}>
							cancel call
						</Button>
						<Button variant='primary' onClick={handleReceive}>
							receiveCall
						</Button>
					</Modal.Footer>
				</Modal>
			</>
		);
	};
	return (
		<div>
			{myId.socketId && (
				<h6>
					your socket id is {myId.socketId} and your peer id is
					{myId.peerId}
				</h6>
			)}

			{receivedCall && (
				<h3>
					You are currently in call with {callerUser.myId.peerId} &{" "}
					{callerUser.myId.socketId}
				</h3>
			)}
			{!receivedCall && users.length > 0 && (
				<ul>
					{users
						.filter((user) => user.peerId !== peerId)
						.map((user) => (
							<div key={user.socketId}>
								<li>{user.peerId}</li>
								<Button onClick={() => callFriend(user.peerId, user.socketId)}>
									callUSer
								</Button>
							</div>
						))}
				</ul>
			)}
			{
				<div className='video_chat'>
					<video ref={myVideo} controls muted />

					<video ref={friendVideo} controls />
				</div>
			}

			{callCame && receiveCallModal()}
			{receivedCall && <button onClick={endcall}>endcall</button>}
		</div>
	);
};

export default App;
