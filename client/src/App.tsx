import './App.css';
import React, {useEffect, useState} from 'react';
import RenderReviewList from './components/RenderReviewList';
import SignInWithSlack from './components/SignInWithSlack';
import Navbar from './components/Navbar';
import ChannelFilter from './components/ChannelFilter';

function App() {
    const queryString = new URLSearchParams(window.location.search);
    const status = queryString.get('status') ?? 'pending';
    const [user, setUser] = useState(null);
    const [selectedChannel, setSelectedChannel] = useState(queryString.get('channel') ?? 'all');

    useEffect(() => {
        fetch(`/api/user`, {
            credentials: 'same-origin',
        }).then((res) => res.json())
            .then((data) => setUser(data));
    }, []);

    return (
        <div className="App">
            {!user && (<SignInWithSlack/>)}
            {user && (
                <div>
                    <div className="expanded-nav">
                        <div className="left">
                            <ChannelFilter selectedChannel={selectedChannel} onSelected={setSelectedChannel}/>
                        </div>
                        <div className="right">
                            <Navbar status={status} user={user}/>
                        </div>
                    </div>
                    <RenderReviewList user={user} channel={selectedChannel} status={status}/>
                </div>
            )}
        </div>
    );
}

export default App;
