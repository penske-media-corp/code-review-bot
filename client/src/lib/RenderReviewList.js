import React from 'react';
import RenderTitle from './RenderTitle'; // Optional theme CSS

import {format} from 'date-fns';

const RenderReviewList = () => {
    const [data, setData] = React.useState(null);
    const queryString = new URLSearchParams(window.location.search);
    const channel = queryString.get('channel') ?? 'all';
    const status = queryString.get('status') ?? 'pending';

    React.useEffect(() => {
        fetch(`/api/reviews/${channel}/${status}`)
            .then((res) => res.json())
            .then((result) => {
                setData(result);
            });
    }, []);

    return (
        <div>
            <RenderTitle/>
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
                {data?.map(item =>
                    <tr key={item.id}>
                        <td>{format(new Date(item.createdAt), 'MMM dd, yyyy hh:mmaaaaa')}</td>
                        <td>{item.owner}</td>
                        <td>
                            <a href={item.pullRequestLink}>{item.pullRequestLink.replace(/.*penske-media-corp\//,'')}</a>
                        </td>
                        <td>
                            <a href={item.slackPermalink}>{item.slackThreadTs}</a>
                        </td>
                        <td>{item.reviewers && item.reviewers.join(', ')}</td>
                        <td>{item.approvers && item.approvers.join(', ')}</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
};

export default RenderReviewList;
