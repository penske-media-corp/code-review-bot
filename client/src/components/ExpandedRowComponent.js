import {format} from 'date-fns';
import {logError} from '../services/log';
import {useState} from 'react';

export const useExpandedRowComponent = ({onUpdate, user}) => {
    const ExpandedRowComponent = ({data}) => {
        const handleClick = ({target}) => {
            const action = target.getAttribute('action');
            const value = target.getAttribute('value');

            fetch(`/api/action/${action}/${value}`,{
                credentials: 'same-origin',
            })
                .then((res) => res.json())
                .then((result) => {
                    result?.data && onUpdate && onUpdate({
                        data: result.data,
                        action,
                    });
                })
                .catch((e) => {
                    setErrorMessage('Error saving data, see console error log for details.');
                    logError(`Error sending: /api/action/${action}/${value}`, e);
                })
        };
        const ActionButton = ({id, label}) => {
            const sanitizedName = label.toLowerCase().replace(' ', '-');

            return (
                <button
                    id={`${sanitizedName}-${id}`}
                    action={sanitizedName}
                    value={id}
                    onClick={handleClick}
                >{label}</button>
            );
        };
        const showClaim = !user || !data.reviewers?.includes(user?.displayName);
        const showApprove = !user || !data.approvers?.includes(user?.displayName);
        const showChange = !user || !data.requestChanges?.includes(user?.displayName);
        const [editing, setEditing] = useState(false);
        const [errorMessage, setErrorMessage] = useState(false);
        const dirtyData = {...data};

        const handleSaveClicked = ({target}) => {
            if (JSON.stringify(dirtyData) !== JSON.stringify(data)) {
                const value = target.getAttribute('value');
                target.parentElement.childNodes.forEach((el) => el.setAttribute('disabled', true));
                fetch(`/api/action/save/${value}`, {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        note: dirtyData.note,
                        jiraTicket: dirtyData.jiraTicket,
                    })
                })
                    .then((res) => res.json())
                    .then((result) => {
                        if (!result.data) {
                            setErrorMessage('Error saving data, see console error log for details.');
                            logError(`Error saving: /api/action/save/${value}`, result);
                            return;
                        }
                        Object.assign(data, result.data);
                        onUpdate && onUpdate({
                            data: result.data,
                            action: 'save',
                        });
                    })
                    .catch((e) => {
                        setErrorMessage('Error saving data, see console error log for details.');
                        logError(`Error sending: /api/action/save/${value}`, e);
                    })
                    .finally(() => setEditing(false));

            } else {
                setEditing(false);
            }
        }

        return (
            <div style={{paddingLeft: '3em'}} className="expanded-row">
                {!editing && (
                    <div>
                        <div className="expanded-nav">
                            <div className="left">
                                {showClaim && (<ActionButton label="Claim" id={data.id}/>)}
                                {showChange && (<ActionButton label="Request Change" id={data.id}/>)}
                                {showApprove && (<ActionButton label="Approve" id={data.id}/>)}
                                <ActionButton label="Close" id={data.id}/>
                                <ActionButton label="Remove" id={data.id}/>
                                <button onClick={() => setEditing(true)}>Edit</button>
                                {errorMessage && (<span className="error">{errorMessage}</span>)}
                            </div>
                            <div className="right small-text">Last updated on {format(new Date(data.updatedAt), 'MMM dd, yyyy hh:mmaaaaa')}</div>
                        </div>
                        <div className="note">{data.note}</div>
                    </div>
                )}
                {editing && (
                    <form id={`edit-${data.id}`}>
                        <div><label htmlFor={`edit-jira-ticket-${data.id}`}><strong>Jira Ticket</strong>:</label></div>
                        <input
                            id="{`edit-jira-ticket-${data.id}`}"
                            defaultValue={data.jiraTicket}
                            onChange={({target}) => dirtyData.jiraTicket = target.value}
                        />
                        <div><label htmlFor={`edit-note-${data.id}`}><strong>Notes</strong>:</label></div>
                        <textarea
                            id="{`edit-note-${data.id}`}" row={3} cols={80}
                            defaultValue={data.note}
                            onChange={({target}) => dirtyData.note = target.value}
                        ></textarea>
                        <div>
                            <button type="button" onClick={() => setEditing(false)} id={`cancel-${data.id}`}>Cancel</button>
                            <button type="button" onClick={handleSaveClicked} id={`save-${data.id}`} value={data.id}>Save</button>
                        </div>
                    </form>
                )}
            </div>
        );
    };

    return ExpandedRowComponent;
}
