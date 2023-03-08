import './App.css';
import {useEffect, useState} from 'react';
import RenderReviewList from './components/RenderReviewList';
import SingInWithSlack from './components/SingInWithSlack';
import {fetchAuthUser} from './services/user';

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchAuthUser().then((result) => setUser(result));
    });

    return (
        <div className="App">
            {!user && (<SingInWithSlack/>)}
            {user && (<RenderReviewList/>)}
        </div>
    );
}

export default App;
