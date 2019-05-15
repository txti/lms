import { createElement } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { Config } from '../config';
import {
  contentItemForUrl,
  contentItemForLmsFile,
} from '../utils/content-item';
import { GooglePickerClient } from '../utils/google-picker-client';
import Button from './Button';
import LMSFilePicker from './LMSFilePicker';
import URLPicker from './URLPicker';

/**
 * An application that allows the user to choose the web page or PDF for an
 * assignment.
 */
export default function FilePickerApp({
  defaultActiveDialog = null,
  isLmsFileAccessAuthorized: authorized,
  onSubmit,
}) {
  const formEl = useRef();
  const {
    authToken,
    authUrl,
    courseId,
    formAction,
    formFields,
    googleClientId,
    googleDeveloperKey,
    lmsName,
    lmsUrl,
    ltiLaunchUrl,
  } = useContext(Config);

  const [activeDialog, setActiveDialog] = useState(defaultActiveDialog);
  const [url, setUrl] = useState(null);
  const [lmsFile, setLmsFile] = useState(null);
  const [lmsFilesAuthorized, setLmsFilesAuthorized] = useState(authorized);
  const googlePicker = useRef(null);

  if (!googlePicker.current && googleClientId && googleDeveloperKey && lmsUrl) {
    googlePicker.current = new GooglePickerClient({
      developerKey: googleDeveloperKey,
      clientId: googleClientId,
      origin: lmsUrl,
    });
  }

  /**
   * Flag indicating whether the form should be auto-submitted on the next
   * render.
   */
  const [shouldSubmit, submit] = useState(false);

  const cancelDialog = () => setActiveDialog(null);
  const selectLMSFile = file => {
    setActiveDialog(null);
    setLmsFile(file);
    submit(true);
  };

  const lmsAuthorized = () => setLmsFilesAuthorized(true);

  const selectURL = url => {
    setActiveDialog(null);
    setUrl(url);
    submit(true);
  };

  const showGooglePicker = async () => {
    try {
      // TODO - Show some indicator here that we are waiting for the user
      // to make a selection.
      const { id, url } = await googlePicker.current.showPicker();
      // TODO - Show an indicator here that something is happening, in case
      // these API calls take a perceptable amount of time.
      await googlePicker.current.enablePublicViewing(id);
      setUrl(url);
      submit(true);
    } catch (err) {
      console.error('Showing picker failed', err);
    }
  };

  // Submit the form after a selection is made via one of the available
  // methods.
  useEffect(() => {
    if (shouldSubmit) {
      // Submit form using a hidden button rather than calling `form.submit()`
      // to facilitate observing the submission in tests and suppressing the
      // actual submit.
      formEl.current.querySelector('input[type="submit"]').click();
    }
  }, [shouldSubmit]);

  let dialog;
  switch (activeDialog) {
    case 'url':
      dialog = (
        <URLPicker
          lmsName={lmsName}
          onCancel={cancelDialog}
          onSelectURL={selectURL}
        />
      );
      break;
    case 'lms':
      dialog = (
        <LMSFilePicker
          authToken={authToken}
          authUrl={authUrl}
          courseId={courseId}
          isAuthorized={lmsFilesAuthorized}
          lmsName={lmsName}
          onAuthorized={lmsAuthorized}
          onCancel={cancelDialog}
          onSelectFile={selectLMSFile}
        />
      );
      break;
    default:
      dialog = null;
  }

  let contentItem = null;
  if (url) {
    contentItem = contentItemForUrl(ltiLaunchUrl, url);
  } else if (lmsFile) {
    contentItem = contentItemForLmsFile(ltiLaunchUrl, lmsFile);
  }
  contentItem = JSON.stringify(contentItem);

  return (
    <main>
      <form
        className="FilePickerApp__form"
        ref={formEl}
        action={formAction}
        method="POST"
        onSubmit={onSubmit}
      >
        <input type="hidden" name="content_items" value={contentItem} />
        {Object.keys(formFields).map(field => (
          <input
            key={field}
            type="hidden"
            name={field}
            value={formFields[field]}
          />
        ))}
        <h1 className="heading-1">Select web page or PDF</h1>
        <p>
          You can select content for your assignment from one of the following
          sources:
        </p>
        <input name="document_url" type="hidden" value={url} />
        <Button
          className="FilePickerApp__source-button"
          label="Enter URL of web page or PDF"
          onClick={() => setActiveDialog('url')}
        />
        <Button
          className="FilePickerApp__source-button"
          label={`Select PDF from ${lmsName}`}
          onClick={() => setActiveDialog('lms')}
        />
        {googlePicker.current && (
          <Button
            className="FilePickerApp__source-button"
            label="Select PDF from Google Drive"
            onClick={showGooglePicker}
          />
        )}
        <input style={{ display: 'none' }} type="submit" />
      </form>
      {dialog}
    </main>
  );
}

FilePickerApp.propTypes = {
  /**
   * The dialog that should be shown when the app is first opened.
   */
  defaultActiveDialog: propTypes.oneOf(['url', 'lms']),

  /** Callback invoked when the form is submitted. */
  onSubmit: propTypes.func,

  /**
   * A hint as to whether the user has authorized the Hypothesis LMS app to
   * access their files in the LMS.
   *
   * If `false`, an authorization prompt will be shown in a popup window if
   * the user clicks on the "Select file from {LMS name}" button.
   */
  isLmsFileAccessAuthorized: propTypes.bool,
};
