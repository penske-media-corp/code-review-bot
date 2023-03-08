import './App.css';
import {useEffect, useState} from 'react';
import RenderReviewList from './components/RenderReviewList';
import SingInWithSlack from './components/SingInWithSlack';

function App() {
    const [user, setUser] = useState(null);
    let isFetching = false;

    useEffect(() => {
        if (user || isFetching) {
            return;
        }
        isFetching = true;
        fetch(`/api/user`, {
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((result) => {
                setUser(result);
                isFetching = false;
            });
    });

    return (
        <div className="App">
            {!user && (<SingInWithSlack/>)}
            {user && (<RenderReviewList/>)}
        </div>
    );
}

export default App;
