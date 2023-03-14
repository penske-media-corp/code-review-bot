import React, {
    MouseEvent
} from 'react';
import {DataViewProps} from '../lib/types';
import {fetchData} from '../services/fetch';
import {logError} from '../services/log';
import {format} from 'date-fns';

const ExpandedRowDataView = ({data, onError, onUpdate, user}: DataViewProps) => {
    const showClaim = !user || !data.reviewers?.includes(user?.displayName);
    const showApprove = !user || !data.approvers?.includes(user?.displayName);
    const showChange = !user || !data.requestChanges?.includes(user?.displayName);

    const handleActionClick = ({currentTarget}: MouseEvent<HTMLButtonElement>) => {
        const action = currentTarget.getAttribute('data-action');
        const value = currentTarget.getAttribute('data-value');

        fetchData(`/api/action/${action}/${value}`)
            .then((result) => {
                result?.data && onUpdate({
                    data: result.data,
                    action,
                });
            })
            .catch((e) => {
                onError && onError('Error saving data, see console error log for details.');
                logError(`Error sending: /api/action/${action}/${value}`, e);
            })
    };

    const ActionButton = ({label, reviewId}: {label: string; reviewId: number}) => {
        const sanitizedName = label.toLowerCase().replace(' ', '-');

        return (
            <button
                id={`${sanitizedName}-${reviewId}`}
                data-action={sanitizedName}
                data-value={reviewId}
                name={`${sanitizedName}-${reviewId}`}
                onClick={handleActionClick}
            >{label}</button>
        );
    };

    return (
        <div>
            <div className="expanded-nav">
                <div className="left">
                    {showClaim && (<ActionButton label="Claim" reviewId={data.id}/>)}
                    {showChange && (<ActionButton label="Request Change" reviewId={data.id}/>)}
                    {showApprove && (<ActionButton label="Approve" reviewId={data.id}/>)}
                    <ActionButton label="Close" reviewId={data.id}/>
                    <ActionButton label="Remove" reviewId={data.id}/>
                    <button name={`edit-review-${data.id}`}
                            onClick={() => onUpdate({data, action: 'edit'})}
                    >Edit</button>
                </div>
                <div className="right small-text">Last updated on {format(new Date(data.updatedAt), 'MMM dd, yyyy hh:mmaaaaa')}</div>
            </div>
            <div className="note">{data.note}</div>
        </div>
    );
};

export default ExpandedRowDataView;
