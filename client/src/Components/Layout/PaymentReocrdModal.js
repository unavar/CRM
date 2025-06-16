import React, { useEffect, useState } from 'react';
import { Modal, Table } from 'antd';
import axios from 'axios';

// Props: visible (bool), onClose (func), proposalId (string/number)
const PaymentRecordModal = ({ visible, onClose, proposalId ,balanceAmount}) => {

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && proposalId) {
            setLoading(true);
            axios
                .get(`/api/payment/getNoOfPayment/${proposalId}`)
                .then((res) => {
                    setData(res.data.payments|| []);
                })
                .catch(() => {
                    setData([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [visible, proposalId]);

    const columns = [
        {
            title: 'Auditor Name',
            dataIndex: 'auditorName',
            key: 'auditorName',
        },
        {
            title: 'Payment Received',
            dataIndex: 'amountReceived',
            key: 'amountReceived',
            render: (value) => `₹${value}`,
        },
        {
            title: 'Balance Amount',
            key: 'balanceAmount',
            render: () => `${balanceAmount}`,
        },
    ];

    return (
        <Modal
            title={"All payments for this Proposal"}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={700}
            destroyOnClose
        >
            <Table
                columns={columns}
                dataSource={data}
                rowKey={(record) => record.id || `${record.auditorName}-${record.fboName}`}
                pagination={false}
                loading={loading}
            />
        </Modal>
    );
};

export default PaymentRecordModal;
