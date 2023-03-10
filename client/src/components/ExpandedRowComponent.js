import {format} from 'date-fns';
import {logError} from '../services/log';

export const useExpandedRowComponent = ({onUpdate, user}) => {
    const expandedRowComponent = ({data}) => {
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
                    // @TODO
                    logError(e);
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

        return (
            <div style={{paddingLeft: '3em'}}>
                <div className="expandedNav">
                    <div className="left">
                        {showClaim && (<ActionButton label="Claim" id={data.id}/>)}
                        {showChange && (<ActionButton label="Request Change" id={data.id}/>)}
                        {showApprove && (<ActionButton label="Approve" id={data.id}/>)}
                        <ActionButton label="Close" id={data.id}/>
                        <ActionButton label="Remove" id={data.id}/>
                    </div>
                    <div className="right">Last updated on {format(new Date(data.updatedAt), 'MMM dd, yyyy hh:mmaaaaa')}</div>
                </div>
                <div>{data.note}</div>
            </div>
        );
    };

    return expandedRowComponent;
}
