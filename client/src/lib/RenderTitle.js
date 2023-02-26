import React from 'react';

export default function RenderTitle() {
    const [data, setData] = React.useState(null);
    const queryString = new URLSearchParams(window.location.search);
    const channel = queryString.get('channel');

    React.useEffect(() => {
        if (channel && channel !== 'all') {
            fetch(`/api/channel/${channel}`)
                .then((res) => res.json())
                .then((result) => {
                    setData(result);
                }).catch(() => setData({name: channel}));
        }
    }, []);

    return (
        <div className="App-header">
            Code Reviews For {data?.name && (`Slack Channel "#${data.name}"`) || 'All Slack Channels'}
        </div>
    );
}
