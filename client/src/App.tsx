import './App.css';
import React, {useEffect, useState} from 'react';
import Cookies from 'js-cookie';
import RenderReviewList from './components/RenderReviewList';
import SignInWithSlackOAuth from './components/SignInWithSlackOAuth';
import SignInWithSlackApp from './components/SignInWithSlackApp';
import Navbar from './components/Navbar';
import ChannelFilter from './components/ChannelFilter';
import {logError} from './services/log';
import {fetchData} from './services/fetch';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Profile from './components/Profile';

interface Session {
    appId: string;
    botChannelId: string;
    teamId: string;
    user?: any;
}

function App() {
    const queryString = new URLSearchParams(window.location.search);
    const [status, setStatus] = useState(queryString.get('status') || Cookies.get('status') || 'pending');
    const [session, setSession] = useState({} as Session);
    const [selectedChannel, setSelectedChannel] = useState(queryString.get('channel') || Cookies.get('channel') || 'all');

    const handleNavBarClick = (value: string) => {
        setStatus(value);
    };

    useEffect(() => {
        fetchData('/api/session')
            .then((data) => setSession(data))
            .catch(logError);
    }, []);

    useEffect(() => {
        Cookies.set('channel', selectedChannel);
    }, [selectedChannel]);

    useEffect(() => {
        Cookies.set('status', status);
    }, [status]);

    return (
        <div className="App">
            {!session?.user
                ? (<div><SignInWithSlackOAuth/> <SignInWithSlackApp appId={session.appId} teamId={session.teamId}/></div>)
                : (
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={(
                                <div>
                                    <div className="expanded-nav">
                                        <div className="left">
                                            <ChannelFilter selectedChannel={selectedChannel} onSelected={setSelectedChannel}/>
                                        </div>
                                        <div className="right">
                                            <Navbar status={status} user={session.user} onClick={handleNavBarClick}/>
                                        </div>
                                    </div>
                                    <RenderReviewList user={session.user} channel={selectedChannel} status={status}/>
                                </div>
                            )} />
                            <Route path="/profile" element={<Profile />}/>
                        </Routes>
                    </BrowserRouter>
                )
            }
        </div>
    );
}

export default App;
