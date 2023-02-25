import './App.css';
import React from 'react';
import {format} from 'date-fns';

function App() {
    const [data, setData] = React.useState(null);
    const queryString = new URLSearchParams(window.location.search);
    const channel = queryString.get('channel') ?? 'all';
    const status = queryString.get('status') ?? 'pending';

    React.useEffect(() => {
        fetch(`/api/reviews/${channel}/${status}`)
            .then((res) => res.json())
            .then((reviews) => {
                if (channel && channel !== 'all') {
                    fetch(`/api/channel/${channel}`)
                        .then((r) => r.json())
                        .then((channel) => {
                            setData({reviews, channel});
                        });
                } else {
                    setData({reviews});
                }
            });
    }, []);

    return (
        <div className="App">
            <div className="App-header">
                Code Reviews For {data?.channel && (`Slack Channel "#${data.channel.name}"`) || 'All Slack Channels'}
            </div>
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
                {data?.reviews?.map(item =>
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
