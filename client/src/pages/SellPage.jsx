import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import './SellPage.css';

import StepOne from '../components/sell/StepOne';
import StepTwo from '../components/sell/StepTwo';
import StepThree from '../components/sell/StepThree';
import StepFour from '../components/sell/StepFour';

const emptyForm = {
  title: '',
  category: '',
  condition: '',
  description: '',
  photos: [],
  pickupLocation: '',
  detailedLocation: '',
  pickupCoordinates: {
    latitude: null,
    longitude: null
  },
  price: '',
  isFree: false,
  openToTrades: false
};

function SellPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const loadItem = async () => {
      try {
        const { data } = await api.get(
          `/items/${id}`
        );

        const user = JSON.parse(
          localStorage.getItem('user') || '{}'
        );

        if (data.owner?._id !== user.id) {
          throw new Error(
            'You are not the owner of this item'
          );
        }

        setFormData({
          ...emptyForm,
          ...data,

          pickupCoordinates:
            data.pickupCoordinates || {
              latitude: null,
              longitude: null
            },

          price: data.isFree
            ? 0
            : data.price ?? ''
        });
      } catch (err) {
        setError(
          err.response?.data?.message ||
          err.message ||
          'Failed to load listing'
        );
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id, isEdit]);

  const updateForm = (newData) => {
    setFormData((prev) => ({
      ...prev,
      ...newData
    }));
  };

  /*
   * Validation is only used when moving through
   * the publishing flow.
   *
   * Map coordinates are NOT required.
   */
  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.title.trim()) {
        return 'Item title is required.';
      }

      if (!formData.category) {
        return 'Please select a category.';
      }

      if (!formData.condition) {
        return 'Please select the item condition.';
      }

      if (!formData.description.trim()) {
        return 'Please add a description.';
      }
    }

    if (
      step === 2 &&
      !formData.pickupLocation.trim()
    ) {
      return 'Please enter a pickup location.';
    }

    /*
     * Map location is intentionally optional.
     *
     * No validation for:
     * formData.pickupCoordinates
     */

    if (
      step === 3 &&
      !formData.isFree &&
      (
        formData.price === '' ||
        Number(formData.price) < 0 ||
        Number.isNaN(Number(formData.price))
      )
    ) {
      return (
        'Enter a valid non-negative price, ' +
        'or choose Free.'
      );
    }

    return '';
  };

  const nextStep = () => {
    const message = validateStep(currentStep);

    if (message) {
      setError(message);
      return;
    }

    setError('');

    setCurrentStep((prev) =>
      Math.min(4, prev + 1)
    );
  };

  const prevStep = () => {
    setError('');

    setCurrentStep((prev) =>
      Math.max(1, prev - 1)
    );
  };

  /*
   * Save Draft
   *
   * A draft can be incomplete.
   * No step validation is performed here.
   */
  const save = async (mode) => {
    if (saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,

        price: formData.isFree
          ? 0
          : (
              formData.price === '' ||
              formData.price === null ||
              formData.price === undefined
            )
            ? 0
            : Number(formData.price),

        /*
         * Keep coordinates optional.
         * If the user did not use the map,
         * send null coordinates.
         */
        pickupCoordinates:
          formData.pickupCoordinates || {
            latitude: null,
            longitude: null
          },

        mode
      };

      const response = isEdit
        ? await api.put(
            `/items/${id}`,
            payload
          )
        : await api.post(
            '/items',
            payload
          );

      if (mode === 'draft') {
        alert(
          'Draft saved successfully.'
        );

        navigate('/lending-dashboard');
      } else {
        alert(
          isEdit
            ? 'Listing updated and sent for admin approval.'
            : 'Listing submitted for admin approval.'
        );

        navigate('/dashboard');
      }

      return response.data;
    } catch (err) {
      console.error(
        'Save listing error:',
        err
      );

      setError(
        err.response?.data?.message ||
        (
          mode === 'draft'
            ? 'Failed to save draft.'
            : 'Failed to publish listing.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Publish requires the actual listing information
   * to be complete.
   *
   * Map coordinates are NOT included.
   */
  const handlePublish = async () => {
    for (let step = 1; step <= 3; step += 1) {
      const message = validateStep(step);

      if (message) {
        setCurrentStep(step);
        setError(message);
        return;
      }
    }

    await save('publish');
  };

  if (loading) {
    return (
      <div className="detail-loading">
        Loading listing...
      </div>
    );
  }

  return (
    <div className="sell-page">

      <div className="sell-header">
        <div className="sell-header-left">

          <span
            className="sell-logo"
            onClick={() =>
              navigate('/dashboard')
            }
          >
            🔗 We Share
          </span>

          <span
            className="sell-nav"
            onClick={() =>
              navigate('/dashboard')
            }
          >
            Browse
          </span>

          <span
            className="sell-nav"
            onClick={() =>
              navigate('/lending-dashboard')
            }
          >
            My Dashboard
          </span>

        </div>
      </div>

      <div className="sell-progress">

        {[
          'Details',
          'Photos',
          'Pricing',
          'Review'
        ].map((label, i) => (
          <div
            key={label}
            className="progress-step"
          >

            <div
              className={
                `step-circle ${
                  currentStep > i + 1
                    ? 'completed'
                    : currentStep === i + 1
                      ? 'active'
                      : ''
                }`
              }
            >
              {currentStep > i + 1
                ? '✓'
                : i + 1}
            </div>

            <span
              className={
                `step-label ${
                  currentStep === i + 1
                    ? 'active'
                    : ''
                }`
              }
            >
              {label}
            </span>

            {i < 3 && (
              <div
                className={
                  `step-line ${
                    currentStep > i + 1
                      ? 'completed'
                      : ''
                  }`
                }
              />
            )}

          </div>
        ))}

      </div>

      <div className="sell-content">

        {error && (
          <div
            className="sell-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {currentStep === 1 && (
          <StepOne
            formData={formData}
            updateForm={updateForm}
          />
        )}

        {currentStep === 2 && (
          <StepTwo
            formData={formData}
            updateForm={updateForm}
          />
        )}

        {currentStep === 3 && (
          <StepThree
            formData={formData}
            updateForm={updateForm}
          />
        )}

        {currentStep === 4 && (
          <StepFour
            formData={formData}
          />
        )}

      </div>

      <div className="sell-footer">

        <button
          className="btn-draft"
          onClick={() => save('draft')}
          disabled={saving}
        >
          💾{' '}
          {saving
            ? 'Saving...'
            : 'Save Draft'}
        </button>

        <div className="sell-footer-right">

          {currentStep > 1 && (
            <button
              className="btn-back"
              onClick={prevStep}
              disabled={saving}
            >
              ← Back
            </button>
          )}

          {currentStep < 4 ? (
            <button
              className="btn-next"
              onClick={nextStep}
              disabled={saving}
            >
              Next Step →
            </button>
          ) : (
            <button
              className="btn-publish"
              onClick={handlePublish}
              disabled={saving}
            >
              {saving
                ? 'Publishing...'
                : '🚀 Publish Listing'}
            </button>
          )}

        </div>

      </div>

    </div>
  );
}

export default SellPage;