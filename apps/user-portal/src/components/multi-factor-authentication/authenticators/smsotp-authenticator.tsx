/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Grid, Icon, List } from "semantic-ui-react";
import { getProfileInfo, updateProfileInfo } from "../../../api";
import { MFAIcons } from "../../../configs";
import { Notification, Validation } from "../../../models";
import { EditSection, ThemeIcon, FormWrapper } from "../../shared";
import Joi from "@hapi/joi";

/**
 * Proptypes for the SMS OTP component.
 */
interface SMSOTPProps {
    onNotificationFired: (notification: Notification) => void;
}

/**
 * SMS OTP section.
 *
 * @return {JSX.Element}
 */
export const SMSOTPAuthenticator: React.FunctionComponent<SMSOTPProps> = (props: SMSOTPProps): JSX.Element => {
    const [mobile, setMobile] = useState("");
    const [isEdit, setIsEdit] = useState(false);
    const { t } = useTranslation();
    const { onNotificationFired } = props;

    const handleUpdate = (mobileNumber) => {
        const data = {
            Operations: [
                {
                    op: "replace",
                    value: {}
                }
            ],
            schemas: [
                "urn:ietf:params:scim:api:messages:2.0:PatchOp"
            ]
        };

        data.Operations[0].value = {
            phoneNumbers: [
                {
                    type: "mobile",
                    value: mobileNumber
                }
            ]
        };

        updateProfileInfo(data)
            .then((response) => {
                if (response.status === 200) {
                    onNotificationFired({
                        description: t(
                            "views:components.mfa.smsOtp.notifications.updateMobile.success.description"
                        ),
                        message: t(
                            "views:components.mfa.smsOtp.notifications.updateMobile.success.message"
                        ),
                        otherProps: {
                            positive: true
                        },
                        visible: true
                    });
                    getProfileInfo()
                        .then((res) => {
                            setMobileNo(res);
                        });
                    setIsEdit(false);
                } else {
                    onNotificationFired({
                        description: t(
                            "views:components.mfa.smsOtp.notifications.updateMobile.error.description"
                        ),
                        message: t(
                            "views:components.mfa.smsOtp.notifications.updateMobile.error.message"
                        ),
                        otherProps: {
                            negative: true
                        },
                        visible: true
                    });
                }
            });
    };

    const setMobileNo = (resp) => {
        let mobileNumber = "";
        resp.phoneNumbers.map((mobileNo) => {
            mobileNumber = mobileNo.value;
        });
        setMobile(mobileNumber);
    };

    const handleEdit = () => {
        setIsEdit(true);
    };

    const handleCancel = () => {
        setIsEdit(false);
    };

    const showEditView = () => {
        if (!isEdit) {
            return (<Grid padded>
                <Grid.Row columns={2}>
                    <Grid.Column width={11} className="first-column">
                        <List.Content floated="left">
                            <ThemeIcon
                                icon={MFAIcons.sms}
                                size="mini"
                                twoTone
                                transparent
                                square
                                rounded
                                relaxed
                            />
                        </List.Content>
                        <List.Content>
                            <List.Header>{t("views:components.mfa.smsOtp.heading")}</List.Header>
                            <List.Description>
                                {t("views:components.mfa.smsOtp.descriptions.hint")}
                            </List.Description>
                        </List.Content>
                    </Grid.Column>
                    <Grid.Column width={5} className="last-column">
                        <List.Content floated="right">
                            <Icon
                                link
                                onClick={handleEdit}
                                className="list-icon"
                                size="small"
                                color="grey"
                                name="pencil alternate"
                            />
                        </List.Content>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
            );
        }
        return (
            <EditSection>
                <Grid>
                    <Grid.Row>
                        <Grid.Column>
                            <List>
                                <List.Item>
                                    <List.Content>
                                        <FormWrapper
                                            formFields={[
                                                {
                                                    type: "text",
                                                    required: true,
                                                    requiredErrorMessage: t("views:components.profile.forms." +
                                                        "mobileChangeForm.inputs.mobile.validations.empty"),
                                                    value:mobile,
                                                    validation: (value: string, validation: Validation) => { 
                                                        let error = Joi.number().integer().validate(value).error;
                                                        if (error) {
                                                            validation.isValid = false;
                                                            validation.errorMessages.push(error.message);
                                                        }
                                                    },
                                                    label: t("views:components.profile.forms.mobileChangeForm.inputs"
                                                        + ".mobile.label"),
                                                    placeholder: t("views:components.profile.forms.mobileChangeForm" +
                                                        ".inputs.mobile.placeholder"),
                                                    name: "mobileNumber"
                                                },
                                                {
                                                    type: "custom",
                                                    element:
                                                        <p style={{ fontSize: "12px" }}>
                                                            <Icon
                                                                color="grey"
                                                                floated="left"
                                                                name="info circle"
                                                            />
                                                            {t("views:components.profile.forms.mobileChangeForm" +
                                                                ".inputs.mobile.note")}
                                                        </p>
                                                },
                                                {
                                                    type: "divider",
                                                    hidden: true
                                                },
                                                {
                                                    type: "submit",
                                                    size: "small",
                                                    value: t("common:update").toString()
                                                },
                                                {
                                                    type: "button",
                                                    size: "small",
                                                    className: "link-button",
                                                    value: t("common:cancel").toString(),
                                                    onClick: handleCancel
                                                }
                                            ]}
                                            groups={[
                                                {
                                                    startIndex: 3,
                                                    endIndex: 5,
                                                    style: "inline"
                                                }
                                            ]}
                                            onSubmit={(values: Map<string, string>) => {
                                                handleUpdate(values.get("mobileNumber"));
                                            }}
                                        />
                                    </List.Content>
                                </List.Item>
                            </List>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </EditSection>
        );
    };

    useEffect(() => {
        if (mobile === "") {
            getProfileInfo()
                .then((response) => {
                    setMobileNo(response);
                });
        }
    });

    return (
        <div>
            {showEditView()}
        </div>
    );
};
