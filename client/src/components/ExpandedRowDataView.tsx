import React, {
    MouseEvent
} from 'react';
import type {DataViewProps} from './ExpandedRow';
import {fetchData} from '../services/fetch';
import {logError} from '../services/log';
import {format} from 'date-fns';

const ExpandedRowDataView = ({data, onError, onUpdate, user}: DataViewProps) => {
    const showClaim = !data.reviewers?.includes(user.displayName) && data.owner !== user.displayName;
    const showApprove = !data.approvers?.includes(user.displayName) && data.owner !== user.displayName;
    const showChange = !data.requestChanges?.includes(user.displayName) && data.owner !== user.displayName;
    const showRequestReview = data.status === 'withdrew' || data.requestChanges || data.reviewers || data.approvers;
    const showWithdraw = data.status !== 'withdrew' && user?.displayName === data.owner;

    const handleActionClick = ({currentTarget}: MouseEvent<HTMLButtonElement>) => {
        const action = currentTarget.getAttribute('data-action');
        const value = currentTarget.getAttribute('data-value');

        if (action === 'delete-record') {
            if (!window.confirm('Do you want to delete all related data for this request?')) {
                return;
            }
        }

        fetchData(`/api/action/${action}/${value}`)
            .then((result) => {
                if (result?.error) {
                    onError(result.error);
                    return;
                }
                result?.data && onUpdate({
                    data: result.data,
                    action,
                });
            })
            .catch((e) => {
                onError('Error saving data, see console error log for details.');
                logError(`Error sending: /api/action/${action}/${value}`, e);
            })
    };

    const ActionButton = ({action, label, reviewId}: {action?: string; label: string; reviewId: number}) => {
        const sanitizedName = action ?? label.toLowerCase().replace(/ /g, '-');

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
                    {showRequestReview && (<ActionButton action="request-review" label="Resubmit for review" reviewId={data.id}/>)}
                    {showWithdraw && (<ActionButton label="Withdraw" reviewId={data.id}/>)}
                    <ActionButton label="Delete Record" reviewId={data.id}/>
                    <button name={`edit-review-${data.id}`}
                            onClick={() => onUpdate({data, action: 'edit'})}
                    >Edit</button>
                </div>
                <div className="right small-text">Last updated on {format(new Date(data.updatedAt), 'MMM dd, yyyy hh:mmaaaaa')}</div>
            </div>
            <div className="note">{data.note}&nbsp;</div>
        </div>
    );
};

ExpandedRowDataView.defaultProps = {
    onError: () => {},
};

export default ExpandedRowDataView;
