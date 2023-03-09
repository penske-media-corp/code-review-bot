import './App.css';
import {useEffect, useState} from 'react';
import RenderReviewList from './components/RenderReviewList';
import SingInWithSlack from './components/SingInWithSlack';
import {fetchAuthUser} from './services/user';
import Navbar from './components/Navbar';
import ChannelFilter from './components/ChannelFilter';

function App() {
    const queryString = new URLSearchParams(window.location.search);
    const status = queryString.get('status') ?? 'pending';
    const [user, setUser] = useState(null);
    const [selectedChannel, setSelectedChannel] = useState(queryString.get('channel') ?? 'all');

    const handleChannelSelectionChange = () => {

    };

    useEffect(() => {
        fetchAuthUser().then((result) => setUser(result));
    }, []);

    return (
        <div className="App">
            {!user && (<SingInWithSlack/>)}
            {user && (
                <div>
                    <div className="expandedNav">
                        <div className="left">
                            <ChannelFilter selectedChannel={selectedChannel} onSelected={setSelectedChannel}/>
                        </div>
                        <div className="right">
                            <Navbar user={user}/>
                        </div>
                    </div>
                    <RenderReviewList user={user} channel={selectedChannel} status={status}/>
                </div>
            )}
        </div>
    );
}

export default App;
