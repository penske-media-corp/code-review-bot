import './App.css';
import React from 'react';
import {format} from 'date-fns';

function App() {
    const [data, setData] = React.useState(null);

    React.useEffect(() => {
        fetch('/api/reviews/pending')
            .then((res) => res.json())
            .then((data) => setData(data))
    }, [])

    return (
        <div className="App">
            <table className="CodeReviewList">
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Owner</th>
                    <th>Pull Request</th>
                    <th>Slack Link</th>
                    <th>Reviewer(s)</th>
                    <th>Approver(s)</th>
                </tr>
                </thead>
                <tbody id="queues">
                {data && data.map(item =>
                    <tr key={item.id}>
                        <td>{format(new Date(item.createdAt), 'MMM dd, yyyy')}</td>
                        <td>{item.owner}</td>
                        <td>
                            <a href={item.pullRequestLink}>{item.pullRequestLink.replace(/.*penske-media-corp\//,'')}</a>
                        </td>
                        <td>
                            <a href={item.slackPermalink}>{item.slackThreadTs}</a>
                        </td>
                        <td>{item.reviewers && item.reviewers.join(', ')}</td>
                        <td>{item.reviewers && item.approvers.join(', ')}</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}

export default App;
